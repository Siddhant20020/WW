
document.addEventListener('DOMContentLoaded', function () {

    fetch('/api/bikefeatures')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('fetchedData').textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });

    const filterForm = document.getElementById('filterForm');
    const filterResultsDiv = document.getElementById('filterResults');


    filterForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const filterField = document.getElementById('filterField').value;
        const filterValue = document.getElementById('filterValue').value;

        fetch(`/api/bikefeatures?${filterField}=${filterValue}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(filteredData => {
                // Clear previous results
                filterResultsDiv.innerHTML = '';

                // Display filtered results
                filteredData.forEach(bike => {
                    const bikeElement = document.createElement('div');
                    bikeElement.textContent = `Bike: ${bike.variant_name}, Price: ${bike['On-road prize']}`;
                    filterResultsDiv.appendChild(bikeElement);
                });
            })
            .catch(error => {
                console.error('Error filtering data:', error);
            });
    });
});
document.addEventListener('DOMContentLoaded', function () {
    const searchButton = document.getElementById('searchButton');

    searchButton.addEventListener('click', function () {
        const searchTerm = document.getElementById('bikeSearchInput').value.trim().toLowerCase();
        window.location.href = `/search?term=${searchTerm}`;
    });
});

