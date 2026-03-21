import pandas as pd
import hashlib
def progress(step, total, msg):
    print(f"[{(step/total)*100:.0f}%] {msg}")

total_steps = 9
step = 0

BASE = "data"
def hash_id(x):
    return hashlib.sha256(str(x).encode()).hexdigest()
SAMPLE_SIZE = 500000

logon = pd.read_csv(
    f"{BASE}/logon.csv",
    usecols=['user','date','pc','activity'],
    parse_dates=['date'],
    nrows=SAMPLE_SIZE
)

file = pd.read_csv(
    f"{BASE}/file.csv",
    usecols=['user','date','filename'],
    parse_dates=['date'],
    nrows=SAMPLE_SIZE
)

email = pd.read_csv(
    f"{BASE}/email.csv",
    usecols=['user','date','to'],
    parse_dates=['date'],
    nrows=SAMPLE_SIZE
)

http = pd.read_csv(
    f"{BASE}/http.csv",
    usecols=['user','date','url'],
    parse_dates=['date'],
    nrows=SAMPLE_SIZE
)

device = pd.read_csv(
    f"{BASE}/device.csv",
    usecols=['user','date','activity'],
    parse_dates=['date'],
    nrows=SAMPLE_SIZE
)

step += 1
progress(step, total_steps, "Loaded data")
for df_ in [logon, file, email, http, device]:
    df_.sort_values(by='date', inplace=True)

step += 1
progress(step, total_steps, "Sorted data")

all_users = pd.concat([
    logon['user'],
    file['user'],
    email['user'],
    http['user'],
    device['user']
]).unique()
user_mapping = pd.DataFrame({
    'original_user': all_users,
    'hashed_user': [hash_id(u) for u in all_users]
})
user_mapping.to_csv("user_mapping.csv", index=False)

print("\nUser mapping saved!")
for df_ in [logon, file, email, http, device]:
    df_['user'] = df_['user'].apply(hash_id)

logon['pc'] = logon['pc'].apply(hash_id)

step += 1
progress(step, total_steps, "Applied hashing")
for df_ in [logon, file, email, http, device]:
    df_['day'] = df_['date'].dt.floor('D')
    df_['hour'] = df_['date'].dt.hour
    df_['weekday'] = df_['date'].dt.weekday
    df_['is_weekend'] = df_['weekday'].isin([5,6]).astype(int)
    df_['is_after_hours'] = ((df_['hour'] < 6) | (df_['hour'] > 20)).astype(int)

step += 1
progress(step, total_steps, "Time features ready")
logon_features = logon.groupby(['user','day']).agg(
    total_logons=('activity','count'),
    after_hours_logons=('is_after_hours','sum'),
    weekend_logons=('is_weekend','sum'),
    distinct_pcs_accessed=('pc','nunique')
).reset_index()

step += 1
progress(step, total_steps, "Logon features")
file_features = file.groupby(['user','day']).agg(
    files_accessed=('filename','count'),
    after_hours_files=('is_after_hours','sum')
).reset_index()

step += 1
progress(step, total_steps, "File features")
email['is_external'] = ~email['to'].str.contains('dtaa.com', na=False)

email_features = email.groupby(['user','day']).agg(
    emails_sent=('to','count'),
    external_emails=('is_external','sum'),
    after_hours_emails=('is_after_hours','sum')
).reset_index()

step += 1
progress(step, total_steps, "Email features")
keywords = ['dropbox','drive','secret','spy','leak']

http['suspicious'] = http['url'].str.contains('|'.join(keywords), case=False, na=False)

http_features = http.groupby(['user','day']).agg(
    web_visits=('url','count'),
    suspicious_web_clicks=('suspicious','sum'),
    after_hours_web=('is_after_hours','sum')
).reset_index()
device_features = device.groupby(['user','day']).agg(
    device_activity=('activity','count'),
    after_hours_device=('is_after_hours','sum')
).reset_index()

step += 1
progress(step, total_steps, "HTTP + Device features")
df = logon_features

df = df.merge(file_features, on=['user','day'], how='left')
df = df.merge(email_features, on=['user','day'], how='left')
df = df.merge(http_features, on=['user','day'], how='left')
df = df.merge(device_features, on=['user','day'], how='left')

df = df.fillna(0)

step += 1
progress(step, total_steps, "Merged dataset")
df['total_after_hours'] = (
    df['after_hours_logons'] +
    df['after_hours_files'] +
    df['after_hours_emails'] +
    df['after_hours_web'] +
    df['after_hours_device']
)
insiders = pd.read_csv("data/insiders.csv")
insiders = insiders[insiders['dataset'] == 4.1]
insiders['start'] = pd.to_datetime(insiders['start'])
insiders['end'] = pd.to_datetime(insiders['end'])
insiders['user'] = insiders['user'].apply(hash_id)
df['label'] = 0
for _, row in insiders.iterrows():
    mask = (
        (df['user'] == row['user']) &
        (df['day'] >= row['start']) &
        (df['day'] <= row['end'])
    )
    df.loc[mask, 'label'] = 1

step += 1
progress(step, total_steps, "Labels added")
print("\nLabel distribution:")
print(df['label'].value_counts())

print("\nFinal Structured Data:")
print(df.head(10))

print("\nShape:", df.shape)
df.to_csv("final_dataset.csv", index=False)