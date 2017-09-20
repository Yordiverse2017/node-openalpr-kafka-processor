//const fs = require('fs')

run('image', 'plate')

// console.log(`Now waiting for URLs from Kafka topic "${TOPIC_NAME_IN}"`)
// console.log(`Identified plates will be written to kafka topic "${TOPIC_NAME_IN}"`)
// console.log('...')
//

async function run(inputTopic, outputTopic) {

  const {consumer, producer} = await initKafka(inputTopic)
  const openalpr = await initOpenALPR()
  const findPlate = await createFindPlateFunction(openalpr)
  const sendMsg = msg => sendMsgToTopic(producer, outputTopic, msg)

  consumer.on('message', async msg => {
    const imgUrl = msg.value
    console.log(`Received image URL: ${imgUrl}`)

    try {
      const out = await findPlate(imgUrl)

      const plate = out.results.map(x => x.plate)
      const ptime = out.processing_time_ms
      console.log(`Plate: ${plate} took ${ptime}ms from file ${imgUrl}`)

      const resp = await sendMsg(JSON.stringify(out))
      console.log(resp)

    } catch (e) {
      console.error('An error occurred while processing message:', msg)
      console.error(e)
    }
  })

}

/**
 * Wrapping `producer.send` into a promise for async/await processing.
 * Note: we send a single message per call but the kafka-node API uses
 * an array of payloads.
 */
async function sendMsgToTopic(producer, topicName, message) {
  return new Promise((resolve, reject) => {

    // we just need a single payload but the API requires and array
    const payloads = [{
      topic: topicName,
      messages: message
    }]

    producer.send(
      payloads,
      (err, data) => err ? reject(err) : resolve(data)
    )

  })
}

/**
 * Asynchronous initialization of the OpenALPR API
 * @returns {Promise<OpenALPR, Error>}
 */
async function initOpenALPR() {
  return new Promise((resolve, reject) => {
    try {
      const openalpr = require("node-openalpr")
      console.log("Starting openalpr ...")
      openalpr.Start(false, false, false, false, 'eu')
      console.log(`OpenALPR version is ${openalpr.GetVersion()}`)

      resolve(openalpr)

    } catch (e) {
      reject(e)
    }
  })
}

/**
 *
 * @returns {Promise.<function(*=): Promise>}
 */
async function createFindPlateFunction(openalpr) {
  return async (path) => new Promise((resolve, reject) => {
      let loop = () => {
        const status = openalpr.IdentifyLicense(path, (error, output) =>
          error
            ? reject(error)
            : resolve(Object.assign({file: path}, output))
        )

        // nasty, but works
        if(status == "queued") {
          setTimeout(loop, 1000)
        }
      }

      loop() // staring the "loop"
  })
}

/**
 * @param inputTopic
 * @returns {Promise.<{consumer: *, producer: *}>}
 */
async function initKafka(inputTopic) {

  console.log("Waiting for Kafka producer and consumer...")

  const kafka = require('kafka-node')
  const client = new kafka.Client()

  const reportError = err => console.error(`err:${err}`)
  const topics = [{topic: inputTopic, partition: 0}]
  const consumer = new kafka.Consumer(client, topics)
    .on('error', reportError)
    .on('offsetOutOfRange', reportError)

  console.log('Consumer is ready')

  const producer = new Promise((resolve, reject) => {
    const producer = new kafka.Producer(client)
    producer.on('ready', () => {
      console.log('Producer is ready')
      resolve(producer)
    })
  })

  return {
    consumer: await consumer,
    producer: await producer
  }
}
