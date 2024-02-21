//for contact
function toggleContactSection() {
    const contactSection = document.querySelector('.contact');
    if (contactSection) {
        contactSection.classList.toggle('visible');
    }
}
document.addEventListener('DOMContentLoaded', function () {
    fetch('/api/bikefeatures')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {

            console.log('Fetched bike features:', data);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
});

document.addEventListener('DOMContentLoaded', function () {
    const searchButton = document.getElementById('searchButton');
    const bikeSearchInput = document.getElementById('bikeSearchInput');

    if (searchButton && bikeSearchInput) {
        searchButton.addEventListener('click', function () {
            const searchInput = bikeSearchInput.value;
            console.log('Search input:', searchInput);
        });
    } else {
        console.error('Search button or search input not found.');
    }
});





