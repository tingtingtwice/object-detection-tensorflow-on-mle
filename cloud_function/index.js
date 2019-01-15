/**
 * Triggered from a change to a Cloud Storage bucket.
 *
 * @param {!Object} event Event payload and metadata.
 * @param {!Function} callback Callback function to signal completion.
 */
'use strict';

const { BigQuery } = require('@google-cloud/bigquery');
const gcs = require('@google-cloud/storage');
const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const sizeOf = require('image-size');
const { GoogleAuth } = require('google-auth-library');
const authFactory = new GoogleAuth();
var util = require('util')

function cmlePredict(b64img) {
    return new Promise((resolve, reject) => {
        authFactory.getApplicationDefault(function (err, authClient) {
            if (err) {
                reject(err);
            }
          	console.log("cmlePredict");

            var ml = google.ml({
                version: 'v1'
            });

            const params = {
                auth: authClient,
                name: 'projects/[PROJECT_ID]/models/[MODEL_NAME]',
                resource: {
                    instances: [
                    {
                        "inputs": {
                        "b64": b64img
                        }
                    }
                    ]
                }
            };
            ml.projects.predict(params, (err, result) => {
                if (err) {
                  console.log("error: " + err);
                    reject(err);
                } else {
                  	console.log("result: " + util.inspect(result));
                    resolve(result);
                }
            });
        });
    });
}

function resizeImg(filepath) {
    return new Promise((resolve, reject) => {
        exec(`convert ${filepath} -resize 600x ${filepath}`, (err) => {
          if (err) {
            console.error('Failed to resize image', err);
            reject(err);
          } else {
            console.log('resized image successfully');
            resolve(filepath);
          }
        });
      });
}

function getAllIndexes(arr, val) {
    var indexes = [], i = -1;
    while ((i = arr.indexOf(val, i+1)) != -1){
        indexes.push(i);
    }
    return indexes;
}

exports.runPrediction = (event, callback) => {
  	console.log(`Processing file: ${event.data.name}`);

    fs.rmdir('./tmp/', (err) => {
        if (err) {
            console.log('error deleting tmp/ dir');
        }
    });

    const object = event.data;
    const fileBucket = object.bucket;
    const filePath = object.name;
    // source input bucket
    const bucket = gcs().bucket(fileBucket);
    // output bucket
    const results_bucket = gcs().bucket(fileBucket + "-results");
    const fileName = path.basename(filePath);
    const file = bucket.file(filePath);

    
    const destination = '/tmp/' + fileName;
    console.log('got a new image', filePath);
  
    return file.download({
      destination: destination
    }).then(() => {
      if(sizeOf(destination).width > 600) {
        console.log('scaling image down...');
        return resizeImg(destination);
      } else {
        return destination;
      }
    }).then(() => {
      console.log('base64 encoding image...');
      let bitmap = fs.readFileSync(destination);
      return new Buffer(bitmap).toString('base64');
    }).then((b64string) => {
      console.log('sending image to CMLE...');
      return cmlePredict(b64string);
    }).then((result) => {
      console.log("Yay we have results!");
      let num_detect = result.data.predictions[0].num_detections;
      // truncate prdiction array
      let classes = result.data.predictions[0].detection_classes.slice(0, num_detect);
      var human_indexes = getAllIndexes(classes, 1);

      let boxes_all_objects = result.data.predictions[0].detection_boxes.slice(0, num_detect);
      var boxes = human_indexes.map(i => boxes_all_objects[i]);
      let scores_all_objects = result.data.predictions[0].detection_scores.slice(0, num_detect);
      var scores = human_indexes.map(i => scores_all_objects[i]);

      console.log("boxes: " + boxes);
      console.log("scores: " + scores);
      console.log("classes: " + classes);
      console.log("num_detect: " + num_detect);

      // Insert row into BQ
      var ingestionTime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
      console.log("ingestionTime: " + ingestionTime);
      var rows = [{
        image_location: "[IMAGE_LOCATION]",
        ingestion_time: ingestionTime,
        input_image_url: "gs://" + fileBucket + "/" + fileName ,
        output_image_url: "gs://" + fileBucket + "-results" + "/" + fileName,
        human_count: boxes.length, 
      }];
      const bigqueryClient = new BigQuery();
      bigqueryClient
        .dataset("[DATASET_NAME]")
        .table  ("[TABLE_NAME]")
        .insert (rows) 
        .then   ((data) => {
        console.log(`Successfully inserted to BQ: ` + data);
      });
      
      boxes.map((box, index) => {
        let dimensions = sizeOf(destination);
        let x0 = box[1] * dimensions.width;
        let y0 = box[0] * dimensions.height;
        let x1 = box[3] * dimensions.width;
        let y1 = box[2] * dimensions.height;    

        // Draw a box on the image around the predicted bounding box
        return new Promise((resolve, reject) => {
          exec(`convert ${destination} -stroke "#39ff14" -strokewidth 10 -fill none -draw "rectangle ${x0},${y0},${x1},${y1}" ${destination}`, (err) => {
            if (err) {
              console.error('Failed to draw rect.', err);
              reject(err);
            } else {
              console.log(`drew the rect:  ${x0},${y0},${x1},${y1}`);
              results_bucket.upload(destination, {destination: filePath});
              resolve(destination);
            }
          });
        });
      });
      
      callback();
    });
};
