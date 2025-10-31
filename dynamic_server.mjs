import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = 8080;
const root = path.join(__dirname, 'public');
const template = path.join(__dirname, 'templates');

let app = express();
app.use(express.static(root));

const db = new sqlite3.Database('./KMDW.sqlite3', sqlite3.OPEN_READONLY, (err) => {
    if(err){
        console.log('Error connecting to database');
    }
    else{
        console.log('Successfully connected to database');
    }
});

app.get('/', (req, res) => {
    fs.readFile(path.join(template, 'index.html'), {encoding: 'utf8'}, (err, data) =>{
        if(err){
            res.status(404).send('Page Not Found 404');
        }
        else{
            res.status(200).type('html').send(data);
        }
    });
});
app.get('/day/:date', (req, res) => {
    db.all('SELECT * FROM KMDW WHERE date = ?', [req.params.date], (err, row) => {
        if(err){
            res.status(500).type('txt').send('SQL Error');
        }
        if(row.length === 0){
            res.status(404).type('txt').send('Day ' + req.params.date + ' not found in database');
        }
        else{
            fs.readFile(path.join(template, 'day.html'), {encoding: 'utf8'}, (err, data) => {
                let string = '';
                string += '<p>The average temperature for the day: ' + row[0].actual_mean_temp + '</p>';
                string += '<p>The low for the day: ' + row[0].actual_min_temp + '</p>';
                string += '<p>The high for the day: ' + row[0].actual_max_temp + '</p>';
                string += '<p>The average low for this day: ' + row[0].average_min_temp + '</p>';
                string += '<p>The average high for this day: ' + row[0].average_max_temp + '</p>';
                string += '<p>The record low for this day: ' + row[0].record_min_temp + '</p>';
                string += '<p>The record high for this day: ' + row[0].record_max_temp + '</p>';
                string += '<p>The year this record low was achieved: ' + row[0].record_min_temp_year + '</p>';
                string += '<p>The year this record high was achieved: ' + row[0].record_max_temp_year + '</p>';
                string += '<p>The actual parcipitation for the day: ' + row[0].actual_precipitation + '</p>';
                string += '<p>The average parcipitation for this day: ' + row[0].average_precipitation + '</p>';
                string += '<p>The record parcipitation for this day: ' + row[0].record_precipitation + '</p>';
                
                let prevDate = null;
                let nextDate = null;

                let response = data.replace('$$$DAY$$$', string);
                response = response.replace('$$$DATE$$$', req.params.date);
                
                db.all('SELECT date FROM KMDW WHERE date < ?', [req.params.date],(err,prevRow)=>{
                    if(prevRow) prevDate = prevRow[prevRow.length - 1].date;
                    db.all('SELECT date FROM KMDW WHERE date > ?', [req.params.date], (err2,nextRow) =>{
                        if(req.params.date === '2014-12-31'){
                            nextDate = '2015-01-01';
                        }
                        else {
                            nextDate = nextRow[0].date;
                        }
                        response = response.replace('$$$PREV_DATE$$$', prevDate ?? '#');
                        response = response.replace('$$$NEXT_DATE$$$', nextDate ?? '#');
                        const chartData = {
                            labels: [
                                'Actual Mean Temp',
                                'Actual Low Temp',
                                'Actual High Temp',
                                'Average Low Temp',
                                'Average High Temp',
                                'Record Low Temp',
                                'Record High Temp',
                                'Record Low Year',
                                'Record High Year',
                                'Actual Precipitation',
                                'Average Precipitation',
                                'Record Precipitation'
                            ],
                            values: [
                                row[0].actual_mean_temp,
                                row[0].actual_min_temp,
                                row[0].actual_max_temp,
                                row[0].average_min_temp,
                                row[0].average_max_temp,
                                row[0].record_min_temp,
                                row[0].record_max_temp,
                                row[0].record_min_temp_year,
                                row[0].record_max_temp_year,
                                row[0].actual_precipitation,
                                row[0].average_precipitation,
                                row[0].record_precipitation
                            ]
                        };
                        
                        response = response.replace('$$$CHART_DATA$$$', JSON.stringify(chartData));
                        
                        
                        res.status(200).type('html').send(response);
                    });
                });
            });
        }
    });
});


app.get('/month/:month', (req, res) => {
    let start_date = req.params.month +  '-01';
    let end_date = req.params.month + '-31';

    db.all('SELECT * FROM KMDW WHERE date BETWEEN ? AND ?', [start_date, end_date], (err, rows) => {
        if(err){
            res.status(500).type('txt').send('SQL Error');
        }
        if(rows.length === 0){
            res.status(404).type('txt').send('Month ' + req.params.month + ' not found in database');
        }
        else{
            fs.readFile(path.join(template, 'month.html'), {encoding: 'utf8'}, (err, data) => {
                let string = '';
                let low = rows[0].actual_min_temp;
                let high = rows[0].actual_max_temp;
                let average_temp_total = Number(rows[0].actual_mean_temp);
                let total_parcipitation = Number(rows[0].actual_precipitation);
                for(let i = 1; i < rows.length; i++){
                    if(rows[i].actual_min_temp < low){
                        low = rows[i].actual_min_temp;
                    }
                    if(rows[i].actual_max_temp > high){
                        high = rows[i].actual_max_temp;
                    }
                    average_temp_total += Number(rows[i].actual_mean_temp);
                    total_parcipitation += Number(rows[i].actual_precipitation);
                }

                string += '<p>The low for the month: ' + low + '</p>';
                string += '<p>The high for the month: ' + high + '</p>';
                string += '<p>The average temperature for the month: ' + average_temp_total / rows.length + '</p>';
                string += '<p>The average daily parcipitation for the month: ' + total_parcipitation / rows.length + '</p>';
                string += '<p>The total parcipitation for the month: ' + total_parcipitation + '</p>';

                let response = data.replace('$$$MONTH$$$', req.params.month);
                response = response.replace('$$$MONTH_DATA$$$', string);

                let [year, month] = req.params.month.split('-').map(Number);
            
                let prevYear = month === 1 ? year - 1 : year;
                let nextYear = month === 12 ? year + 1 : year;
                let prevMonth = month === 1 ? 12 : month - 1;
                let nextMonth = month === 12 ? 1 : month + 1;
                
                let pad = (n) => String(n).padStart(2, '0');
                let prevLink = `${prevYear}-${pad(prevMonth)}`;
                let nextLink = `${nextYear}-${pad(nextMonth)}`;

                db.get('SELECT 1 FROM KMDW WHERE date LIKE ? LIMIT 1', [prevLink + '%'], (errPrev, prevExists) => {
                    if(errPrev){
                        res.status(500).type('txt').send('SQL Error');
                    }
                    db.get('SELECT 1 FROM KMDW WHERE date LIKE ? LIMIT 1', [nextLink + '%'],(errNext, nextExists) =>{
                        if(errNext){
                            res.status(500).type('txt').send('SQL Error');
                        }
                        
                        response = response.replace('$$$PREV_DATE$$$', prevExists ? prevLink : '#');
                        response = response.replace('$$$NEXT_DATE$$$', nextExists ? nextLink : '#');


                        const chartData = {
                            labels: ['Low', 'High', 'Average Temp', 'Total Precipitation', 'Avg Daily Precipitation'],
                            values: [low, high, average_temp_total / rows.length, total_parcipitation, total_parcipitation / rows.length]
                        };
                
                        response = response.replace('$$$CHART_DATA$$$', JSON.stringify(chartData));
                

                
                        res.status(200).type('html').send(response);


                    })
                })
            });
        };
    });
});

app.get('/season/:season', (req, res) => {

    if(req.params.season == 'spring' || req.params.season == 'summer' || req.params.season == 'fall' || req.params.season == 'winter'){

        let [start_date, end_date] = returnSeason(req.params.season);
        db.all('SELECT * FROM KMDW WHERE date BETWEEN ? AND ?', [start_date, end_date], (err, rows) => {
            if(err){
                res.status(500).type('txt').send('SQL Error');
            }
            else{
                fs.readFile(path.join(template, 'season.html'), {encoding: 'utf8'}, (err, data) => {
                    let string = '';
                    let low = rows[0].actual_min_temp;
                    let high = rows[0].actual_max_temp;
                    let average_temp_total = Number(rows[0].actual_mean_temp);
                    let total_parcipitation = Number(rows[0].actual_precipitation);
                    for(let i = 1; i < rows.length; i++){
                        if(rows[i].actual_min_temp < low){
                            low = rows[i].actual_min_temp;
                        }
                        if(rows[i].actual_max_temp > high){
                            high = rows[i].actual_max_temp;
                        }
                        average_temp_total += Number(rows[i].actual_mean_temp);
                        total_parcipitation += Number(rows[i].actual_precipitation);
                    }

                    string += '<p>The low for the season: ' + low + '</p>';
                    string += '<p>The high for the season: ' + high + '</p>';
                    string += '<p>The average temperature for the season: ' + average_temp_total / rows.length + '</p>';
                    string += '<p>The average daily parcipitation for the season: ' + total_parcipitation / rows.length + '</p>';
                    string += '<p>The total parcipitation for the season: ' + total_parcipitation + '</p>';

                    let response = data.replace('$$$SEASON$$$', req.params.season);
                    response = response.replace('$$$SEASON_DATA$$$', string);

                    const seasons = ['spring', 'summer', 'fall', 'winter'];
                    let index = seasons.indexOf(req.params.season.toLowerCase());

                    let prevSeason = index > 0 ? seasons[index - 1] : null;
                    let nextSeason = index < seasons.length - 1 ? seasons[index + 1] : null;

                    
                    if (!prevSeason) prevSeason = 'winter';  
                    if (!nextSeason) nextSeason = 'spring';  

                    
                    response = response.replace('$$$PREV_DATE$$$', prevSeason);
                    response = response.replace('$$$NEXT_DATE$$$', nextSeason);

    
                    
                    let img = '';
                    switch(req.params.season){
                        case 'spring':
                        img = '<img src="/pictures/Spring-pic.jpg" alt="Image of birds" width="360px" height="360px" class="float-center"/>';
                        break;

                        case 'summer':
                        img = '<img src="/pictures/Summer-pic.png" alt="Image of the sun" width="360px" height="360px" class="float-center"/>';
                        break;

                        case 'fall':
                        img = '<img src="/pictures/Fall-pic.jpg" alt="Image of a tree" width="360px" height="360px" class="float-center"/>';
                        break;

                        case 'winter':
                        img = '<img src="/pictures/Winter-pic.jpg" alt="Image of a snowflake" width="360px" height="360px" class="float-center"/>';
                        break;
                    }

                    response = response.replace('$$$IMG$$$', img);
                    
                    const chartData = {
                        labels: ['Low', 'High', 'Average Temp', 'Total Precipitation', 'Avg Daily Precipitation'],
                        values: [
                            low,
                            high,
                            average_temp_total / rows.length,
                            total_parcipitation,
                            total_parcipitation / rows.length
                        ]
                    };
                    
                    response = response.replace('$$$CHART_DATA$$$', JSON.stringify(chartData));
                    
                    res.status(200).type('html').send(response);
                });
            }
        });
    }
    else{
        res.status(404).type('txt').send('Season ' + req.params.season + ' not found in database');
    }
});

function returnSeason(season){
    if(season === 'spring'){
        return ['2015-03-01', '2015-06-30'];
    }
    if(season === 'summer'){
        return ['2014-07-01', '2014-08-31'];
    }
    if(season === 'fall'){
        return ['2014-09-01', '2015-11-30'];
    }
    if(season === 'winter'){
        return ['2014-12-01', '2015-02-28'];
    }

}

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
