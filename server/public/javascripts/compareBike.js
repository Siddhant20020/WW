<script>
  async function populateBikeOptions(priceRange) {
  try {
    const response = await fetch(`/api/bikefeatures?priceRange=${priceRange}`);
  const bikes = await response.json();

  if (bikes.length === 0) {
    document.getElementById("comparisonResult").innerHTML =
    "No bikes found within the selected price range.";
  document.getElementById("bikeSelection").style.display = "none";
  return;
    }

  const bike1Select = document.getElementById("bike1");
  const bike2Select = document.getElementById("bike2");

  bike1Select.innerHTML = ""; // Clear previous options
  bike2Select.innerHTML = ""; // Clear previous options

    bikes.forEach((bike) => {
      const option = document.createElement("option");
  option.text = bike.variant_name;
  option.value = bike._id;
  bike1Select.add(option);
  bike2Select.add(option.cloneNode(true));
    });
  document.getElementById("bikeSelection").style.display = "block";
  } catch (error) {
    console.error("Error fetching bike options:", error);
  }
}

  async function compareBikes() {
  const bike1Id = document.getElementById("bike1").value;
  const bike2Id = document.getElementById("bike2").value;

  try {
    const response = await fetch("/api/bikefeatures/compare", {
    method: "POST",
  headers: {
    "Content-Type": "application/json",
      },
  body: JSON.stringify({bikeIds: [bike1Id, bike2Id] }),
    });
  const bikes = await response.json();

  const comparisonResultElement =
  document.getElementById("comparisonResult");
  comparisonResultElement.innerHTML = generateComparisonTable(bikes);
  } catch (error) {
    console.error("Error comparing bikes:", error);
  }
}

  function generateComparisonTable(bikes) {
    let overallWinner = null;
  let tableHtml = `
  <h2>Comparison Result:</h2>
  <table>
    <tr>
      <th>Feature</th>
      <th>${bikes[0].variant_name}</th>
      <th>${bikes[1].variant_name}</th>
      <th>Winner</th>
    </tr>
    `;

    for (const key in bikes[0]) {
    if (
    key !== "_id" &&
    key !== "__v" &&
    key !== "image_url" &&
    key !== "variant_name"
    ) {
      const winner = getWinner(key, bikes[0][key], bikes[1][key]);
    tableHtml += `
    <tr>
      <td>${key}</td>
      <td>${bikes[0][key]}</td>
      <td>${bikes[1][key]}</td>
      <td class="${winner}">${winner}</td>
    </tr>
    `;
    if (overallWinner === null || winner === "Tie") {
      overallWinner = winner;
      }
    }
  }

    tableHtml += `</table>`;
  tableHtml += `<p>Overall Winner: ${overallWinner}</p>`;

  // Include pros and cons in the comparison result

  return tableHtml;
}

  function getWinner(feature, value1, value2) {
  if (typeof value1 === "number" && typeof value2 === "number") {
    return value1 > value2
  ? bikes[0].variant_name
  : value1 < value2
      ? bikes[1].variant_name
  : "Tie";
  } else {
    return value1 > value2
  ? bikes[0].variant_name
  : value1 < value2
      ? bikes[1].variant_name
  : "Tie";
  }
}

  const budgetSelect = document.getElementById("budget");
  budgetSelect.addEventListener("change", function () {
  const selectedBudget = this.value;
  populateBikeOptions(selectedBudget);
});

  document
  .getElementById("compareButton")
  .addEventListener("click", compareBikes);
</script>