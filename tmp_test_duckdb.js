const duckdb = require('duckdb');
const db = new duckdb.Database(':memory:');
const conn = db.connect();

conn.exec('CREATE TABLE test (name VARCHAR)', (err) => {
  if (err) throw err;
  conn.all('INSERT INTO test VALUES (?)', ['hello'], (err2) => {
    if (err2) {
      console.log('Error with array params:', err2.message);
      conn.all('INSERT INTO test VALUES (?)', 'world', (err3) => {
        if (err3) {
          console.log('Error with individual params:', err3.message);
        } else {
          console.log('Success with individual params');
        }
      });
    } else {
      console.log('Success with array params');
    }
  });
});
