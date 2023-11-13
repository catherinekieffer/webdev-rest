import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

const port = 8000;

let app = express();
app.use(express.json());

/********************************************************************
 ***   DATABASE FUNCTIONS                                         *** 
 ********************************************************************/
// Open SQLite3 database (in read-write mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});

// // Create Promise for SQLite3 database SELECT query 
// function dbSelect(query, params) {
//     return new Promise((resolve, reject) => {
//         db.all(query, params, (err, rows) => {
//             if (err) {
//                 reject(err);
//             }
//             else {
//                 resolve(rows);
//             }
//         });
//     });
// }

// this funciton is from the server.mjs we wrote in dynamiccereal - this works, the above function does not work for me
function dbSelect(query, params) {
    let p = new Promise((resolve, reject) => {
        //inside here we put our asynchronous calls
        //we 
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err); //this will trigger the .catch block
            }
            else {
                resolve(rows);
            }
        })  //then the parameters that substitue for our question marks
    });
    return p;
}


// Create Promise for SQLite3 database INSERT or DELETE query
function dbRun(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}

/********************************************************************
 ***   REST REQUEST HANDLERS                                      *** 
 ********************************************************************/
// GET request handler for crime codes
app.get('/codes', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)

    let sql = 'SELECT * FROM Incidents';
    let params = [];
    let statement = " WHERE";
    // maybe this becomes LIMIT ??

    // if (req.query.hasOwnProperty("limit")) {
    //     console.log(req.query["limit"]);
    //     let sql2 = statement + " limit=?";
    //     sql = sql+sql2;
    //     params.push(req.query["limit"])
    //     statement = " AND";
    // };

    console.log(sql)
    console.log(params)

    dbSelect(sql, params)
    .then((rows) => {
        res.status(200).type('json').send(rows); //we just send the rows back as JSON

    })
    .catch((error) => {
        res.status(500).type('txt').send(error); //send back whatever the error is 
    });


    
    // res.status(200).type('json').send({}); // <-- you will need to change this
});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    
    res.status(200).type('json').send({}); // <-- you will need to change this
});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    
    res.status(200).type('json').send({}); // <-- you will need to change this
});

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data
    
    res.status(200).type('txt').send('OK'); // <-- you may need to change this
});

// DELETE request handler for new crime incident
app.delete('/remove-incident', (req, res) => {
    console.log(req.body); // uploaded data
    
    res.status(200).type('txt').send('OK'); // <-- you may need to change this
});

/********************************************************************
 ***   START SERVER                                               *** 
 ********************************************************************/
// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});

//nothing