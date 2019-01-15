# object-detection-tensorflow-on-mle

This project allows you to connect images uploaded to Google Cloud Storage, and setup and trigger to cloud function, which is able to send the image binary to the Cloud 
Machine Learning Engine on GCP with a pretrained Object Detection API model setup. This model is able to identify 90+ objects like vehicles, trees, zebras, cups...
This proof of concept project counts the number of people appeared in an image and record its meta data and save to Google BigQuery.
Part of the transformation in cloud function also puts boundary boxes around the identified objects, and save that in a results folder in GCS(Google Cloud Storage)

Here are the steps of how to get this ML pipeline up and running:

1. Create input and output ("-results") buckets in GCS 
2. Create Cloud Function by using the index.js and package.json files here (NodeJS 6)
3. Setup a Cloud Function trigger on the input folder on GCS, such that when new files are added this funciton is initiated
4. Upload the pretrained TensorFLow model (ssd_mobilenet_v1_coco_2018_01_28/saved_model/saved_model.pb) to Cloud ML Engine.
5. Create a BigQuery dataset and table to store the people count data written from Cloud Function
