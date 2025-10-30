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

                let response = data.replace('$$$DAY$$$', string);
                response = response.replace('$$$DATE$$$', req.params.date);
                res.status(200).type('html').send(response);
            });
        }
    });
});

app.get('/month/:month', (req, res) => {
    let start_date = req.params.month +  '-1';
    let end_date = req.params.month + '-31';
    db.all('SELECT * FROM KMDW WHERE date BETWEEN ? AND ?', [start_date, end_date], (err, rows) => {
        if(err){
            res.status(500).type('txt').send('SQL Error');
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
                res.status(200).type('html').send(response);
            });
        }
    });
});

app.get('/season/:season', (req, res) => {
    const [start_date, end_date] = returnSeason(req.params.season);
    console.log(start_date + ' ' + end_date);
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
                res.status(200).type('html').send(response);
            });
        }
    });
});

function returnSeason(season){
    if(season === 'spring'){
        return ['2015-3-1', '2015-6-30'];
    }
    if(season === 'summer'){
        return ['2014-7-1', '2014-8-31'];
    }
    if(season === 'fall'){
        return ['2014-9-1', '2015-11-30'];
    }
    if(season === 'winter'){
        return ['2014-12-1', '2015-2-28'];
    }
}

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
