x = {
    type: 'line',
    data: {
        datasets: [{
            label: 'Processed',
            data: [{x: 1506852000000, y: 0}, {x: 1506938400000, y: 0}, {x: 1507024800000, y: 0},
                {x: 1507111200000, y: 0}, {x: 1507197600000, y: 0}, {x: 1507284000000, y: 31},
                {x: 1507370400000, y: 37}, {x: 1507456800000, y: 37}, {x: 1507543200000, y: 39},
                {x: 1507629600000, y: 39}],
            tension: 0.1,
            backgroundColor: 'rgba(153,255,51,0.4)'
        }]
    },
    options: {
        scales: {
            xAxes: [{type: 'time', scaleLabel: {display: true, labelString: 'Day'}}],
            yAxes: [{display: true, ticks: {beginAtZero: true, steps: 10, stepValue: 10, max: 100}}]
        }
    }
}
