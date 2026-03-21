import os

import json
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, precision_recall_curve
from sklearn.preprocessing import StandardScaler


BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _resolve_path(path: str) -> str:
    if os.path.isabs(path):
        return path
    candidate = os.path.join(BASE_DIR, path)
    if os.path.exists(candidate):
        return candidate
    return path


def _safe_zscore(x: pd.Series) -> pd.Series:
    if len(x) < 2:
        return pd.Series(0, index=x.index)
    std = x.std()
    if std == 0 or np.isnan(std):
        return pd.Series(0, index=x.index)
    return (x - x.mean()) / (std + 1e-5)


def _apply_event_scoring(
    df_part: pd.DataFrame,
    drop_cols: list[str],
    scaler: StandardScaler,
    model: IsolationForest,
    event_threshold: float,
) -> pd.DataFrame:
    df_part = df_part.copy()
    X = df_part.drop(columns=drop_cols)
    X_scaled = scaler.transform(X)
    df_part['anomaly_score'] = -model.decision_function(X_scaled)
    df_part['anomaly'] = (df_part['anomaly_score'] > event_threshold).astype(int)

    df_part = df_part.sort_values(['user', 'day'])
    df_part['rolling_anomaly'] = (
        df_part.groupby('user')['anomaly']
        .rolling(window=3, min_periods=1)
        .sum()
        .reset_index(0, drop=True)
    )
    df_part['temporal_flag'] = (df_part['rolling_anomaly'] >= 2).astype(int)
    return df_part


def _aggregate_users(df_part: pd.DataFrame) -> pd.DataFrame:
    return (
        df_part.groupby('user')
        .agg(
            anomaly_score=('anomaly_score', 'max'),
            temporal_flag=('temporal_flag', 'sum'),
            label=('label', 'max'),
        )
        .reset_index()
    )


def _calibrate_user_rule(user_val: pd.DataFrame, min_recall: float = 0.5):
    positives = int((user_val['label'] == 1).sum())
    if positives == 0:
        return {
            'score_threshold': float(np.quantile(user_val['anomaly_score'], 0.99)),
            'temporal_min': 3,
            'temporal_max': 10_000,
            'precision': 0.0,
            'recall': 0.0,
            'flagged': 0,
        }

    score_thresholds = np.unique(np.quantile(user_val['anomaly_score'], np.linspace(0.85, 0.995, 60)))
    temporal_mins = [2, 3, 4, 5, 6]
    temporal_maxes = [6, 8, 10, 12, 15, 20, 10_000]

    best_any = None
    best_constrained = None

    for score_thr in score_thresholds:
        for tmin in temporal_mins:
            for tmax in temporal_maxes:
                pred = (
                    (user_val['anomaly_score'] > score_thr)
                    & (user_val['temporal_flag'] >= tmin)
                    & (user_val['temporal_flag'] <= tmax)
                )
                tp = int(((pred == 1) & (user_val['label'] == 1)).sum())
                fp = int(((pred == 1) & (user_val['label'] == 0)).sum())
                flagged = tp + fp
                precision = (tp / flagged) if flagged else 0.0
                recall = tp / positives
                f05 = (1.25 * precision * recall) / (0.25 * precision + recall) if (precision + recall) else 0.0

                candidate = {
                    'score_threshold': float(score_thr),
                    'temporal_min': int(tmin),
                    'temporal_max': int(tmax),
                    'precision': float(precision),
                    'recall': float(recall),
                    'f05': float(f05),
                    'flagged': int(flagged),
                    'tp': int(tp),
                    'fp': int(fp),
                }

                def better(a, b):
                    if b is None:
                        return True
                    if a['precision'] != b['precision']:
                        return a['precision'] > b['precision']
                    if a['recall'] != b['recall']:
                        return a['recall'] > b['recall']
                    return a['flagged'] < b['flagged']

                if better(candidate, best_any):
                    best_any = candidate

                if recall >= min_recall and better(candidate, best_constrained):
                    best_constrained = candidate

    def widen_temporal_max(rule: dict) -> dict:
        rule = dict(rule)
        if rule.get('temporal_max', 10_000) < 10_000:
            rule['temporal_max'] = int(min(10_000, rule['temporal_max'] + 2))
        return rule

    if best_constrained is not None:
        return widen_temporal_max(best_constrained)

    best_any = dict(best_any)
    best_any.pop('f05', None)
    return widen_temporal_max(best_any)


def run_insider_detection(input_path: str | None = None, verbose: bool = False):
    train_base = _resolve_path('final_dataset.csv')
    if input_path is None:
        input_path = train_base
    input_path = _resolve_path(input_path)

    df_base = pd.read_csv(train_base, parse_dates=['day'])
    if verbose:
        print(f"Base training data loaded from {train_base}:", df_base.shape)

    if os.path.abspath(input_path) != os.path.abspath(train_base):
        df_new = pd.read_csv(input_path, parse_dates=['day'])
        if verbose:
            print(f"New data for prediction loaded from {input_path}:", df_new.shape)
        df_base_subset = df_base[df_base['day'] < '2010-09-01'].copy()
        df_base_subset['is_new'] = False
        df_new['is_new'] = True
        df = pd.concat([df_base_subset, df_new], ignore_index=True)
    else:
        df = df_base.copy()
        df['is_new'] = df['day'] >= '2010-09-01'

    df = df.sort_values(by=['user', 'day'])

    df['logon_change'] = df.groupby('user')['total_logons'].diff().fillna(0)
    df['file_change'] = df.groupby('user')['files_accessed'].diff().fillna(0)
    df['email_change'] = df.groupby('user')['emails_sent'].diff().fillna(0)

    df['logon_zscore'] = df.groupby('user')['total_logons'].transform(_safe_zscore)
    df['file_zscore'] = df.groupby('user')['files_accessed'].transform(_safe_zscore)
    df['email_zscore'] = df.groupby('user')['emails_sent'].transform(_safe_zscore)

    train_df = df[df['day'] < '2010-07-01']
    val_df = df[(df['day'] >= '2010-07-01') & (df['day'] < '2010-09-01')]
    test_df = df[df['is_new'] == True].copy()

    if train_df.empty:
        train_df = df.iloc[: int(len(df) * 0.6)]
    if val_df.empty:
        val_df = df.iloc[int(len(df) * 0.6) : int(len(df) * 0.8)]
    if test_df.empty:
        test_df = df.iloc[int(len(df) * 0.8) :]

    if len(train_df[train_df['label'] == 0]) > 10:
        train_df = train_df[train_df['label'] == 0]

    drop_cols = ['user', 'day', 'label', 'is_new']
    X_train = train_df.drop(columns=drop_cols)
    X_val = val_df.drop(columns=drop_cols)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    model = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
    )
    model.fit(X_train_scaled)

    val_scores = -model.decision_function(X_val_scaled)
    y_val = val_df['label'].reset_index(drop=True)

    precision, recall, thresholds = precision_recall_curve(y_val, val_scores)
    f1 = 2 * (precision * recall) / (precision + recall + 1e-8)
    recall = recall[:-1]
    f1 = f1[:-1]

    min_threshold = np.percentile(val_scores, 50)
    valid_mask = thresholds > min_threshold

    min_recall = 0.3
    recall_mask = recall >= min_recall
    final_mask = valid_mask & recall_mask

    if np.any(final_mask):
        best_idx = np.argmax(f1[final_mask])
        best_threshold = thresholds[final_mask][best_idx]
    else:
        best_threshold = thresholds[np.argmax(f1)]

    safety_threshold = np.percentile(val_scores, 85)
    event_threshold = float(max(best_threshold, safety_threshold))

    val_scored = _apply_event_scoring(val_df, drop_cols, scaler, model, event_threshold)
    test_scored = _apply_event_scoring(test_df, drop_cols, scaler, model, event_threshold)

    user_val = _aggregate_users(val_scored)
    rule = _calibrate_user_rule(user_val, min_recall=0.5)

    user_test = _aggregate_users(test_scored)
    user_test['final_prediction'] = (
        (user_test['anomaly_score'] > rule['score_threshold'])
        & (user_test['temporal_flag'] >= rule['temporal_min'])
        & (user_test['temporal_flag'] <= rule['temporal_max'])
    ).astype(int)

    user_pred_map = user_test.set_index('user')['final_prediction']
    test_scored['user_prediction'] = test_scored['user'].map(user_pred_map).fillna(0).astype(int)
    test_scored['final_flag'] = (test_scored['user_prediction'] == 1).astype(int)

    insiders_real = user_test[user_test['final_prediction'] == 1].copy()
    mapping_path = _resolve_path('user_mapping.csv')
    if os.path.exists(mapping_path):
        mapping = pd.read_csv(mapping_path)
        insiders_real = insiders_real.merge(
            mapping,
            left_on='user',
            right_on='hashed_user',
            how='left',
        )

    scores = {
        'event_threshold': event_threshold,
        'user_rule': {
            'score_threshold': rule.get('score_threshold'),
            'temporal_min': rule.get('temporal_min'),
            'temporal_max': rule.get('temporal_max'),
        },
        'validation_estimates': {
            'precision': rule.get('precision'),
            'recall': rule.get('recall'),
            'flagged': rule.get('flagged'),
        },
        'test_counts': {
            'total_users': int(len(user_test)),
            'flagged_users': int((user_test['final_prediction'] == 1).sum()),
            'total_events': int(len(test_scored)),
            'flagged_events': int((test_scored['final_flag'] == 1).sum()),
        },
    }

    if verbose:
        print('User rule:', {k: rule[k] for k in ['score_threshold', 'temporal_min', 'temporal_max', 'precision', 'recall', 'flagged']})
        print('\nUSER EVAL (test window)')
        print(classification_report(user_test['label'], user_test['final_prediction']))
        print('\nEVENT EVAL (test window)')
        print(classification_report(test_scored['label'], test_scored['final_flag']))

    return {
        'event_data': test_scored,
        'user_summary': user_test,
        'insiders': insiders_real,
        'scores': scores,
    }


if __name__ == '__main__':
    uploaded = os.path.join(BASE_DIR, 'uploaded_data.csv')
    input_path = uploaded if os.path.exists(uploaded) else None
    results = run_insider_detection(input_path=input_path, verbose=True)
    results['event_data'].to_csv(os.path.join(BASE_DIR, 'event_results.csv'), index=False)
    results['user_summary'].to_csv(os.path.join(BASE_DIR, 'user_summary.csv'), index=False)
    print('\nSCORES')
    print(json.dumps(results['scores'], indent=2))
    print('\nINSIDERS')
    insiders_df = results['insiders']
    if isinstance(insiders_df, pd.DataFrame):
        if len(insiders_df) == 0:
            print('No insiders flagged')
        else:
            print(insiders_df.to_string(index=False))
    else:
        print(insiders_df)