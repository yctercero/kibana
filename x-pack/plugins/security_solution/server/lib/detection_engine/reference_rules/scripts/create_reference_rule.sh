#!/bin/sh
#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#
curl -s -k \
   -H "Content-Type: application/json" \
   -H 'kbn-xsrf: 123' \
   -u ytercero:AWqrPVbWnlKVW@6isSX@ \
   -X POST http://localhost:5601/api/alerts/alert \
   -d '
{
  "params":{
      "server":"howdy",
      "threshold": 0.90
   },
   "consumer":"alerts",
   "alertTypeId":"siem.referenceRule",
   "schedule":{
      "interval":"1m"
   },
   "actions":[],
   "tags":[
      "cpu"
   ],
   "notifyWhen":"onActionGroupChange",
   "name":"Oh hai world!"
}'


