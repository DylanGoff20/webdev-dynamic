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

app.get('/day.html/:date', (req, res) => {
    db.all('SELECT * FROM KMDW WHERE date == ?', [req.params.date], (err, rows) => {
        if(err){
            res.status(500).type('txt').send('SQL Error');
        }
        else{
            fs.readFile(path.join(template, 'temperature.html'), {encoding: 'utf8'}, (err, data) => {
                let tr_string = '';
                for(let i = 0; i < rows.length; i++){
                    tr_string += '<tr><td>' + rows[i].date + '</td>';
                    tr_string += '<td>' + rows[i].actual_mean_temp + '</td>';
                    tr_string += '<td>' + rows[i].actual_min_temp + '</td>';
                    tr_string += '<td>' + rows[i].actual_max_temp + '</td></tr>';
                }
                let response = data.replace('$$$TEMPERATURE_ROWS$$$', tr_string);
                res.status(200).type('html').send(response);
            });
        }
    });
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
