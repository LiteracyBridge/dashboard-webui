#!/usr/bin/env bash
set -x
# script to refresh dashboard data from s3.

aws s3 sync --delete s3://dashboard-lb-stats/data data
aws s3 sync --delete s3://dashboard-lb-stats/uf uf
