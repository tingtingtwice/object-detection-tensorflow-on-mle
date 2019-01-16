# Counting People with TensorFlow Object Detection API

This project allows you to connect images uploaded to Google Cloud Storage to Cloud Function by setting up an object creation trigger, which is able to send the image binary to the Cloud Machine Learning Engine on GCP with a pretrained TensorFlow Object Detection API model.
- Other than humans, this model is able to identify [90 other objects](https://github.com/tensorflow/models/blob/master/research/object_detection/data/mscoco_label_map.pbtxt) like cars, hotdogs, zebras, cups...So feel free to repurpose or even [further train it](https://cloud.google.com/blog/products/gcp/training-an-object-detector-using-cloud-machine-learning-engine) to identify more specific objects.
- This proof of concept project counts the number of people appeared in an image and record its metadata and save to Google BigQuery.
- Part of the transformation in Cloud Function also puts boundary boxes around the identified objects, and save that in a results folder in GCS (Google Cloud Storage)

Here are the steps of how to get this ML pipeline up and running:

1. Create input and output ("-results") buckets in GCS 
2. Create Cloud Function by using the index.js and package.json files here (NodeJS 6)
3. Setup a Cloud Function trigger on the input folder on GCS, such that when new files are added this funciton is initiated
4. Upload the pretrained TensorFLow model (ssd_mobilenet_v1_coco_2018_01_28/saved_model/saved_model.pb) to Cloud ML Engine.
5. Create a BigQuery dataset and table to store the people count data written from Cloud Function

![alt text](https://github.com/tingtingtwice/object-detection-tensorflow-on-mle/blob/master/architectual_diagram.png)

![alt text](https://github.com/tingtingtwice/object-detection-tensorflow-on-mle/blob/master/couple.jpg)
![alt text](https://github.com/tingtingtwice/object-detection-tensorflow-on-mle/blob/master/frisbee.jpg)

DataStudio Report: https://datastudio.google.com/open/14ZGPdRRYoHz2df4NWBzNgaJzSeGO6kIP
