import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/health');
  await page.waitForSelector('main');
  
  const metrics = await page.evaluate(() => {
    const body = document.body.getBoundingClientRect();
    const root = document.getElementById('root').getBoundingClientRect();
    const dashboardLayout = document.querySelector('#root > div').getBoundingClientRect();
    const main = document.querySelector('main').getBoundingClientRect();
    const header = document.querySelector('header').getBoundingClientRect();
    const section = document.querySelector('section').getBoundingClientRect();
    return { 
      body: {w: body.width, h: body.height},
      root: {w: root.width, h: root.height},
      dashboardLayout: {w: dashboardLayout.width, h: dashboardLayout.height},
      main: {w: main.width, h: main.height, left: main.left},
      header: {w: header.width, h: header.height, left: header.left},
      section: {w: section.width, h: section.height, left: section.left}
    };
  });
  console.log(JSON.stringify(metrics, null, 2));
  await browser.close();
})();
