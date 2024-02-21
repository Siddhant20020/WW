document.addEventListener('DOMContentLoaded', function() {
   
    const searchButton = document.querySelector('.search-bar button');

 
    searchButton.addEventListener('click', function() {
     
        const budgetInput = document.querySelector('.search-bar input');
        const budget = budgetInput.value;

    
        alert(`Searching for bikes within budget: ${budget}`);
    });
});

