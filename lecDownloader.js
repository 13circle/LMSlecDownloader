const puppeteer = require('puppeteer');
const request = require('request');
const fs = require('fs');
const readlineSync = require('readline-sync');
const hiddenQuestion = require('./hidden-question').hiddenQuestion;

let download_info = {
    donwloaded: 0, max: 0,
    view: 0, view_max: 0, wk: 0,
    viewCompleted: false,
    wkCompleted: false
};
let downloadRoot = './DownloadedCourses';

async function run() {

    const id = readlineSync.question('LMS ID: ');
    const pw = await hiddenQuestion('LMS PW: ');

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--disable-features=site-per-process'
        ]
    });

    const page = await browser.newPage();

    await page.goto(
        'https://sso1.mju.ac.kr/login.do?redirect_uri=http://lms.mju.ac.kr/ilos/bandi/sso/index.jsp',
        { waitUntil: 'networkidle0' }
    );

    await page.type('#id', id);
    await page.type('#passwrd', pw);
    await page.click('#loginButton');

    await page.waitForSelector('.m-box2 > ol .sub_open');

    console.log('Successfully logged in');

    let list = await page.$$eval(
        '.m-box2 > ol .sub_open',
        list => {
            let txts = new Array();
            list.forEach(e => {
                txts.push(e.getAttribute('kj'));
            });
            return txts;
        }
    );

    console.log('Listing courses completed. ' + list.length + ' courses detected. \n');

    page.on('dialog', dialog => {
        dialog.accept();
    });

    if(!fs.existsSync(downloadRoot)) fs.mkdirSync(downloadRoot);
    console.log('Download start');

    for(let list_i = 0, max_wk, subject_name, viddir; list_i < list.length; list_i++) {

        await page.evaluate(kj => eclassRoom(kj), list[list_i]);
        await page.goto(
            'http://lms.mju.ac.kr/ilos/st/course/online_list_form.acl',
            { waitUntil: 'networkidle0' }
        );
        await page.waitForSelector('.wb-on');
        max_wk = await page.$$eval('.wb-on', l => l.length);
        await page.waitForSelector('a[href="/ilos/st/course/submain_form.acl"]');
        subject_name = await page.$eval('a[href="/ilos/st/course/submain_form.acl"]', e => e.textContent);

        console.log(`\nCourse ${list_i + 1}: ${subject_name}`);

        viddir = `${downloadRoot}/${subject_name}`;
        if(!fs.existsSync(viddir)) fs.mkdirSync(viddir);

        for(let wk_i = 1, view_list; wk_i <= max_wk; wk_i++) {

            console.log('WEEK #' + wk_i);

            viddir = `${downloadRoot}/${subject_name}/${wk_i}주차`;
            if(!fs.existsSync(viddir)) fs.mkdirSync(viddir);
            download_info.wk = wk_i; download_info.wkCompleted = false;

            await page.goto(
                'http://lms.mju.ac.kr/ilos/st/course/online_list_form.acl?WEEK_NO=' + wk_i,
                { waitUntil: 'networkidle0' }
            );
            await page.waitForSelector('.lecture-box:last-child');
            view_list = await page.$$eval(
                '.view', 
                l => l.map(e => e.getAttribute('onclick'))
            );
            view_list = view_list.map(
                e => e.replace('viewGo(', '')
                      .replace(');', '')
                      .replace(/'/g, '')
                      .split(', ')
            );

            download_info.view_max = view_list.length; download_info.view = 0;
            for(let view_i = 0, view_links; view_i < view_list.length; view_i++) {
                await page.evaluate(
                    v => viewGo(v[0], v[1], v[2], v[3]),
                    view_list[view_i]
                );
                await page.waitForSelector('.item-title-lesson');
                view_links = await page.$$eval(
                    '.item-title-lesson',
                    list => {
                        let lessonParam;
                        lessonParam = list.map(e => e.getAttribute('val'))
                        lessonParam = lessonParam.map(e => {
                            let l = e.split('^');
                            let lessonObj = {
                                content_id: l[1],
                                organization_id: l[2],
                                tabldx: '',
                                navi: 'current',
                                item_id: l[0],
                                lecture_weeks: l[3],
                                WEEK_NO: 1,
                                week: ''
                            };
                            lessonObj = JSON.stringify(lessonObj);
                            lessonObj = lessonObj.replace('{', '')
                                                 .replace('}', '')
                                                 .replace(/"/g, '')
                                                 .replace(/:/g, '=')
                                                 .replace(/,/g, '&');
                            lessonObj = 'http://lms.mju.ac.kr/ilos/st/course/online_view_form.acl' + '?' + lessonObj;
                            return lessonObj;
                        });
                        return lessonParam;
                    }
                );

                download_info.max = view_links.length; download_info.viewCompleted = false;
                download_info.donwloaded = 0;
                for(let link_i = 0, file, video_link, vidname, vidpath; link_i < view_links.length; link_i++) {
                    await page.goto(view_links[link_i], {waitUntil:'networkidle0'});
                    video_frame = await (await page.$('#contentViewer')).contentFrame();
                    await video_frame.waitForSelector('#test_player_html5_api source');
                    video_link = await video_frame.$eval('#test_player_html5_api source', e => e.getAttribute('src'));
                    vidname = await page.$eval(
                        `.navi-tables > li:nth-child(${link_i + 1}) > .item-title-lesson`,
                        e => e.textContent.replace(/ /g, '_') + '.mp4'
                    );
                    vidpath = viddir + `/${vidname}`;
                
                    console.log(`Donwloading ${vidname}...`);

                    request({
                        url: video_link,
                        strictSSL: false
                    })
                    .on('response', response => {
                        if(response.statusCode >= 400) return;
                        file = fs.createWriteStream(vidpath);
                        response.pipe(file).on('error', err => {
                            fs.unlink(vidpath, err => {
                                if(err) throw err;
                            });
                            process.exit(1);
                        });
                        file.on('finish', () => {
                            download_info.donwloaded++;
                            console.log(`${vidname} download complete`);
                            if(download_info.donwloaded == download_info.max) {
                                download_info.viewCompleted = true;
                                download_info.view++;
                                if(download_info.view == download_info.view_max) {
                                    download_info.wkCompleted = true;
                                    console.log(`WEEK #${download_info.wk} download complete`);
                                }
                            }
                            file.close();
                        });
                        file.on('error', err => {
                            fs.unlink(vidpath, err => {
                                if(err) throw err;
                            });
                            process.exit(1);
                        });
                    });
                }
                while(!download_info.viewCompleted) await page.waitFor(1000);
                await page.goto(
                    'http://lms.mju.ac.kr/ilos/st/course/online_list_form.acl?WEEK_NO=' + wk_i,
                    { waitUntil: 'networkidle0' }
                );
                await page.waitForSelector('.lecture-box:last-child');
            }
            while(!download_info.wkCompleted) await page.waitFor(1000);
        }
        await page.goto('http://lms.mju.ac.kr/ilos/main/main_form.acl', {waitUntil:'networkidle0'});
        await page.waitForSelector('.m-box2 > ol .sub_open');
        console.log(`Course ${list_i + 1} (${subject_name}) download complete`);
    }

    console.log('Donwloaded all courses. Exiting process...');

    await browser.close();
}

console.log('\n=== LMS Lecture Downloader === \n');
run();
