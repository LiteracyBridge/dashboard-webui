#!/usr/bin/env bash
set -x
# script to refresh dashboard data from dropbox.

if [ -z "${dropbox}" ]; then
    dropbox=~/Dropbox
    echo "dropbox in ${dropbox}"
fi

mkdir -p data
cp  ${dropbox}/DashboardReports/* data/
for fp in $(tail -n +2 ${dropbox}/DashboardReports/project_list.csv) ; do
  proj=${fp%,*};
  echo ${proj};
  (mkdir -p data/${proj}; cd data/${proj}; pwd; ls; cp ${dropbox}/DashboardReports/${proj}/* .)
done
