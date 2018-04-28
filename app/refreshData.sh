#!/usr/bin/env bash
set -x
# script to refresh dashboard data from dropbox.

if [ -z ${dropbox-} ]; then
  dropbox=~/Dropbox
fi

rm -rf uf data
mkdir -p data
cp  ${dropbox}/DashboardReports/* data/
for fp in $(tail -n +2 ${dropbox}/DashboardReports/project_list.csv) ; do
  proj=${fp%,*};
  echo ${proj};
  (mkdir -p data/${proj}; cd data/${proj}; pwd; ls; cp -r ${dropbox}/DashboardReports/${proj}/* .)
done

mkdir -p uf
cp -r ${dropbox}/AWS-LB/ufReports/uf/* uf/

