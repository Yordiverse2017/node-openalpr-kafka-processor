// Created by Viliam Simko
// using the example from https://github.com/Sneko/node-openalpr.git

const openalpr = require("node-openalpr")
const fs = require('fs')

async function identify(path) {
  return new Promise((resolve, reject) => {
    openalpr.IdentifyLicense(path, (error, output) =>
      error
        ? reject(error)
        : resolve(Object.assign({file: path}, output))
    )
  })
}

console.log("Starting openalpr ...")

if(openalpr.Start.length < 5){
  console.warn('This version of node-openalpr does not support other regions than "us"')
  console.warn('Try: yarn add https://github.com/Sneko/node-openalpr.git')
}

openalpr.Start(false, false, false, false, 'eu')

console.log(`OpenALPR version is ${openalpr.GetVersion()}`)

async function process(dirname) {
  // get the JPEGS for processing
  const jpegs = fs.readdirSync(dirname)
    .filter(f => f.endsWith('.jpg'))
    .map(f => dirname + '/' + f)

  for (file of jpegs) {
    try {
      const out = await identify(file)

      const plate = out.results.map(x => x.plate)
      const ptime = out.processing_time_ms
      console.log(`Plate: ${plate} took ${ptime}ms from file ${file}`)
    } catch (e) {
      console.log(`Error while processing file: ${file} -- `, e.message)
    }
  }
  // openalpr.Stop()
}

const datadir = (process.argv && process.argv[1]) || "../data"
process(datadir)
