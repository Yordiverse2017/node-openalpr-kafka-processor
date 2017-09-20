# node-openalpr-kafka-processor

### Input messages
- input messages are consumed from `image` topic
- every image is a single string containing path to the image file (now in a local filesystem, later in HDFS)

### Output messages
- extracted data are serialized as JSON
- pushed to the `plate` topic

### Installation
We expect that kafka is running locally inside a docker container, e.g. `biggis-project/biggis-kafka`

```sh
# install and prepare for development
git clone ...this repo...
cd node-openalpr-kafka-processor
yarn
```

### Debugging

```sh
# run the processor
node alpr-kafka-processor.js

# show results on using kafkacat
kafkacat -C -b localhost -t plate -o 0 | sed -n '/^{/p' | jq '.file, .results[].plate, .processing_time_ms'

# send some data using kafkacat
find /path/to/dir/with/images -name *.jpg | kafkacat -P -b localhost -t image -p 0
```
