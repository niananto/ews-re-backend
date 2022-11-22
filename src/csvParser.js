const csv = require('csv-parser')
const fs = require('fs')
const results = [];

fs.createReadStream('assets/bed shear stress.csv')
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    // console.log(results);
    // write into file
    fs.writeFile('assets/currentBedShearStress.txt', JSON.stringify(results, null, ' '), function (err) {
        if (err) return console.log(err);
    });
  });