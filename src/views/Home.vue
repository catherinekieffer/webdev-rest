<script setup>
import { reactive, ref, onMounted, initCustomFormatter } from "vue";
import ToggleCrimeButton from "../selectButton.vue";

let crime_url = ref("");
let table = reactive([]);
let dialog_err = ref(false);
let neighborhood_array = reactive([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17
]);
let code_map = reactive({});
let neighborhood_map = {};
let crimes_num_table = {};
let map = reactive({
  leaflet: null,
  center: {
    lat: 44.955139,
    lng: -93.102222,
    address: "",
  },
  zoom: 12,
  bounds: {
    nw: { lat: 45.008206, lng: -93.217977 },
    se: { lat: 44.883658, lng: -92.993787 },
  },
  neighborhood_markers: [
    { location: [44.942068, -93.020521], marker: null },
    { location: [44.977413, -93.025156], marker: null },
    { location: [44.931244, -93.079578], marker: null },
    { location: [44.956192, -93.060189], marker: null },
    { location: [44.978883, -93.068163], marker: null },
    { location: [44.975766, -93.113887], marker: null },
    { location: [44.959639, -93.121271], marker: null },
    { location: [44.9477, -93.128505], marker: null },
    { location: [44.930276, -93.119911], marker: null },
    { location: [44.982752, -93.14791], marker: null },
    { location: [44.963631, -93.167548], marker: null },
    { location: [44.973971, -93.197965], marker: null },
    { location: [44.949043, -93.178261], marker: null },
    { location: [44.934848, -93.176736], marker: null },
    { location: [44.913106, -93.170779], marker: null },
    { location: [44.937705, -93.136997], marker: null },
    { location: [44.949203, -93.093739], marker: null },
  ],
  crime_markers: [],
});

const getClassForTableRow = (incident) => {
  if (
    incident.toLowerCase().includes("homicide") ||
    incident.toLowerCase().includes("murder") ||
    incident.toLowerCase().includes("rape") ||
    incident.toLowerCase().includes("robbery") ||
    incident.toLowerCase().includes("assault") ||
    incident.toLowerCase().includes("arson")
  ) {
    return "highlight-red";
  } else if (
    incident.toLowerCase().includes("burglary") ||
    incident.toLowerCase().includes("theft") ||
    incident.toLowerCase().includes("property") ||
    incident.toLowerCase().includes("graffiti")
  ) {
    return "highlight-orange";
  } else {
    return "highlight-yellow";
  }
};

// Vue callback for once <template> HTML has been added to web page
onMounted(() => {
  // Create Leaflet map (set bounds and valied zoom levels)
  map.leaflet = L.map("leafletmap").setView(
    [map.center.lat, map.center.lng],
    map.zoom
  );
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 11,
    maxZoom: 18,
  }).addTo(map.leaflet);
  map.leaflet.setMaxBounds([
    [44.883658, -93.217977],
    [45.008206, -92.993787],
  ]);

  let district_boundary = new L.geoJson();
  district_boundary.addTo(map.leaflet);
  fetch("data/StPaulDistrictCouncil.geojson")
    .then((response) => {
      return response.json();
    })
    .then((result) => {
      result.features.forEach((value) => {
        district_boundary.addData(value);
      });
    })
    .catch((error) => {
      console.log("Error:", error);
    });

});

function updateUI(){
    // console.log("current map.center: "+map.center);
    var center = map.leaflet.getCenter();
    // console.log("currnet map.getCenter(): "+center);
    var latitude = document.getElementById("latitude");
    var longitude = document.getElementById("longitude");
    var address = document.getElementById("address");

    latitude.value = center.lat; //update the boxes with the current center
    longitude.value = center.lng;
    map.center.lat = center.lat;
    map.center.lng = center.lng;
    // console.log("currnet map.center now that is has been changed:"+map.center)

    var fetchUrl =
      "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
      map.center.lat +
      "&lon=" +
      map.center.lng;
    fetch(fetchUrl)
      .then((response) => {
        return response.json();
      })
      .then((json) => {
        var location = json.display_name;
        // map.center = center;
        address.value = location;
        map.center.address = location;
      });

  neighborhood_array.length = 0; // Clear the array

  var bounds = map.leaflet.getBounds();
  var nw_bounds = bounds.getNorthWest();
  var se_bounds = bounds.getSouthEast();
  var nw_lat = nw_bounds.lat;
  var se_lat = se_bounds.lat;
  var nw_lng = nw_bounds.lng;
  var se_lng = se_bounds.lng;
  map.neighborhood_markers.forEach(function (markerData, index) {
    var lat = markerData.location[0];
    var lng = markerData.location[1];
    if (lat < nw_lat && lat > se_lat && lng > nw_lng && lng < se_lng) {
      neighborhood_array.push(index+1);
    }
  });
  return neighborhood_array;
}

function replaceIncompleteAddress(address) {
  const addressParts = address.split(" ");

  let addressNumberIndex = -1;
  for (let i = 0; i < addressParts.length; i++) {
    if (addressParts[i].includes("X")) {
      addressNumberIndex = i;
      break;
    }
  }

  if (addressNumberIndex !== -1) {
    addressParts[addressNumberIndex] = addressParts[addressNumberIndex].replace(
      /X/g,
      "0"
    );
  }

  const updatedAddress = addressParts.join(" ");

  return updatedAddress;
}

// FUNCTIONS
// Function called once user has entered REST API URL

// Function to handle fetch and return a promise
function fetchData(url) {
  return fetch(crime_url.value + url)
    .then((response) => response.json())
    .catch((error) => {
      console.log("error");
      console.log(error);
    });
}

function initializeCrimes() {
  // Use Promise.all to execute all fetch requests concurrently
  Promise.all([
    fetchData("/codes"),
    fetchData("/neighborhoods"),
    fetchData("/incidents"),
  ])
    .then(([codes, neighborhoods, incidents]) => {
      // Process codes
      codes.forEach((code_object) => {
        code_map[code_object.code] = code_object.type;
      });

      // Process neighborhoods
      neighborhoods.forEach((neigh_object) => {
        neighborhood_map[neigh_object.id] = neigh_object.name;
        crimes_num_table[neigh_object.name] = 0;
      });

      // Process incidents
      console.log(incidents);
      incidents.forEach((crime) => {
        table.push({
          code: crime.code,
          case_number: crime.case_number,
          incident_type: code_map[crime.code],
          incident: crime.incident,
          grid: crime.police_grid,
          neighborhood: neighborhood_map[crime.neighborhood_number],
          block: replaceIncompleteAddress(crime.block),
          date: crime.date,
          time: crime.time,
          neighborhood_number: crime.neighborhood_number,
        });
        console.log(table)

        Object.keys(crimes_num_table).forEach((neigh) => {
          if (neighborhood_map[crime.neighborhood_number] == neigh) {
            crimes_num_table[neigh]++;
          }
        });
      });

      // Update the map
      map.neighborhood_markers.forEach((marker, index) => {
        L.marker(marker.location)
          .addTo(map.leaflet)
          .bindPopup(
            Object.values(crimes_num_table)[index].toString() + " Crimes"
          )
          .openPopup();
      });
    })
    .catch((error) => {
      console.log("error");
      console.log(error);
    });
}

// Function called when user presses 'OK' on dialog box
function closeDialog() {
  let dialog = document.getElementById("rest-dialog");
  let url_input = document.getElementById("dialog-url");
  if (crime_url.value !== "" && url_input.checkValidity()) {
    dialog_err.value = false;
    dialog.close();
    initializeCrimes();
    map.leaflet.on('moveend', updateUI);
    console.log("valid");
  } else {
    dialog_err.value = true;
  }
}

async function deleteIncident(caseNumber) {
  const userConfirmed = window.confirm("Are you sure you want to delete this incident?");
  
  if (!userConfirmed) {
    return; // Do nothing if the user cancels the deletion
  }

  try {
    const response = await fetch(`${crime_url.value}/remove-incident`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ case_number: caseNumber }),
    });

    if (response.ok) {
      console.log(`Incident with case number ${caseNumber} deleted successfully.`);
      fetchAndRefreshTable();
      return response.json();
    } else {
      console.error("Failed to delete incident.");
      throw new Error("Failed to delete incident");
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

function pressGoAddress() {
    var address = document.getElementById("address").value;
  if (address.trim() !== "") {
      // see if an address was entered
      map.center.address = address;
      console.log(map.center.address);
      address = address.replaceAll(" ", "+"); // change spaces to pluses
      var baseUrl = "https://nominatim.openstreetmap.org/search?q=";
      var addUrl="+Saint+Paul+Minnesota&format=json&polygon=1&addressdetails=1"
      if(address.includes("Saint Paul")) {
        addUrl="+Minnesota&format=json&polygon=1&addressdetails=1"
      } else if(address.includes("Minnesota")||address.includes("MN")) {
        addUrl="+Saint+Paul&format=json&polygon=1&addressdetails=1"
      } else if((address.includes("Minnesota")||address.includes("MN"))&&address.includes("Saint Paul")) {
        addUrl = "&format=json&polygon=1&addressdetails=1"
      }
      
      var fetchUrl =
        baseUrl +
        address +
        // address + "&format=json&polygon=1&addressdetails=1";

        "+Saint+Paul+Minnesota&format=json&polygon=1&addressdetails=1";
      
      fetch(fetchUrl)
        .then((response) => {
          return response.json();
        })
        .then((json) => {
          var newCenter = L.latLng(json[0].lat, json[0].lon);
          map.center.lat = json[0].lat;
          map.center.lng = json[0].lon;
          map.leaflet.setView(newCenter, 17, { animate: true }); // move the map to the new center and zoom in
        });
      }
}

function pressGoCoordinates() {
  var latitude = document.getElementById("latitude").value;
  var longitude = document.getElementById("longitude").value;
  if ((longitude < -93.217977) || (longitude > -92.993787)) {
    console.log("coordinates are out of bounds of this area");
    return;
  } else if ((latitude < 44.883658) || (latitude > 45.008206)) {
    console.log("coordinates are out of bounds of this area");
    return;
  }

  if (latitude.trim() !== "" && longitude.trim() !== "") {
    var fetchUrl =
      "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
      latitude +
      "&lon=" +
      longitude;
    fetch(fetchUrl)
      .then((response) => {
        return response.json();
      })
      .then((json) => {
        map.leaflet.setView([latitude, longitude], 14, { animate: true }); // move the map to the new center and zoom in
      });
  }
}

const selectCrime = (address, date, time, incident, case_number) => {
  address = address.replaceAll(" ", "+");
  var redIcon = new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
  var baseUrl = "https://nominatim.openstreetmap.org/search?q=";
  var fetchUrl =
    baseUrl +
    address +
    "+Saint Paul+Minnesota&format=json&polygon=1&addressdetails=1";
  fetch(fetchUrl)
    .then((response) => {
      return response.json();
    })
    .then((json) => {
      let markerLocation = [json[0].lat, json[0].lon];

      // Create an HTML string that includes details and the button
      const popupContent = `<div>
                              <b>Date:</b> ${date} </br>
                              <b>Time:</b> ${time} </br>
                              <b>Incident:</b> ${incident}<br/>
                              <button id="removeButton" class="button" type="button">Remove</button>
                            </div>`;

      const marker = L.marker(markerLocation, { icon: redIcon })
        .addTo(map.leaflet)
        .bindPopup(popupContent)
        .on("popupopen", function () {
          // Attach event listener to the button after the popup is open
          document
            .getElementById("removeButton")
            .addEventListener("click", function () {
              // Remove the marker when the button is clicked
              removeMarker(case_number);
            });
        });

      marker.openPopup();

      map.crime_markers.push({
        location: markerLocation,
        marker: marker,
        case_number: case_number,
      });
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
};

const removeMarker = (case_number, selected) => {
  let indexToRemove = map.crime_markers.findIndex(
    (item) => item.case_number === case_number
  );

  if (indexToRemove !== -1) {
    let markerToRemove = map.crime_markers[indexToRemove].marker;

    // Assuming markerToRemove is a Leaflet marker
    if (map.leaflet && markerToRemove) {
      markerToRemove.remove();
      map.leaflet.removeLayer(markerToRemove);
      map.crime_markers.splice(indexToRemove, 1); // Remove the marker from the array
    }
  }
  selected=!selected
};

async function filterCrimes() {
  var checkboxList = document.getElementById("checkboxList");
  var checkboxes = checkboxList.getElementsByTagName("input");
  var start_date = document.getElementById("start_date");
  var end_date = document.getElementById("end_date");
  var max_incidents = document.getElementById("max-incidents");
  let code_array = [];
  let final_url = "/incidents?";

  function getKeyByValue(object, value) {
    return Object.keys(object).find((key) => object[key] === value);
  }

  for (var i = 0; i < checkboxes.length; i++) {
    if (checkboxes[i].checked) {
      code_array.push(
        getKeyByValue(code_map, checkboxes[i].parentElement.innerText.trim())
      );
    }
  }

  if (code_array.length !== 0) {
    final_url += "code=";
    final_url += code_array.join(',');
}


  if (start_date.value != "") {
    final_url += `&start_date=${start_date.value}`;
  }

  if (end_date.value != "") {
    final_url += `&end_date=${end_date.value}`;
  }

  if (max_incidents.value != "0") {
    final_url += `&limit=${max_incidents.value}`;
  }

  console.log(final_url);
  try {
    table.length = 0;
    const incidents = await fetchData(final_url);

    incidents.forEach((incident) => {
      table.push({
        case_number: incident.case_number,
        incident_type: code_map[incident.code],
        incident: incident.incident,
        grid: incident.police_grid,
        neighborhood: neighborhood_map[incident.neighborhood_number],
        block: replaceIncompleteAddress(incident.block),
        date: incident.date,
        time: incident.time,
        neighborhood_number: incident.neighborhood_number,
      });
    });

    // Now that the fetch operation is complete, you can update the table
    console.log(table);
  } catch (error) {
    console.log("error");
    console.log(error);
  }
}

const newIncident = ref({
    case_number: '',
    date: '',
    time: '',
    code: '',
    incident: '',
    police_grid: '',
    neighborhood_number: '',
    block: ''
  // Add other necessary fields for the new incident
});

// Method to handle submitting a new incident
async function addNewIncident() {
  try {
    const response = await fetch(`${crime_url.value}/new-incident`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newIncident.value),
    });

    if (response.ok) {
      console.log('New incident added successfully!');
      await fetchAndRefreshTable();
      resetForm();
    } else {
      console.error('Failed to add new incident.');
      // Handle error or display error message to the user
    }
  } catch (error) {
    console.error('Error:', error);
    // Handle network or other errors
  }
}

async function fetchAndRefreshTable() {
  try {
    table.length = 0;
    const incidents = await fetchData("/incidents");

    incidents.forEach((incident) => {
      table.push({
        case_number: incident.case_number,
        incident_type: code_map[incident.code],
        incident: incident.incident,
        grid: incident.police_grid,
        neighborhood: neighborhood_map[incident.neighborhood_number],
        block: replaceIncompleteAddress(incident.block),
        date: incident.date,
        time: incident.time,
        neighborhood_number: incident.neighborhood_number,
      });
    });

    console.log(table);
  } catch (error) {
    console.log('Error fetching incidents:', error);
  }
}

function resetForm() {
  newIncident.value = {
    case_number: '',
    date: '',
    time: '',
    code: '',
    incident: '',
    police_grid: '',
    neighborhood_number: '',
    block: ''
    // Reset other fields here
  };
}

</script>
<template>
  <dialog id="rest-dialog" open>
    <h1 class="dialog-header">St. Paul Crime REST API</h1>
    <label class="dialog-label">URL: </label>
    <input
      id="dialog-url"
      class="dialog-input"
      type="url"
      v-model="crime_url"
      placeholder="http://localhost:8000"
    />
    <p class="dialog-error" v-if="dialog_err">Error: must enter valid URL</p>
    <br />
    <button class="button" type="button" @click="closeDialog">OK</button>
  </dialog>
  <div class="grid-container">
    <div class="grid-x grid-padding-x">
      <div id="leafletmap" class="cell auto"></div>
    </div>
  </div>

  <div class="ui-row">
    <label>Address: </label><input id="address" type="text" />
  </div>
  <div class="ui-row">
    <button class="button" type="button" @click="pressGoAddress">Go</button>
  </div>

  <div class="ui-row">
    <label>Latitude: </label><input id="latitude" type="text" />
  </div>
  <div class="ui-row">
    <label>Longitude: </label><input id="longitude" type="text" />
  </div>

  <div class="ui-row">
    <button class="button" type="button" @click="pressGoCoordinates">Go</button>
  </div>

  <!-- New Incident Form -->
  <button class="button" type="button" data-toggle="new-incident-dropdown">
    Toggle New Incident Form
  </button>
  <div
    class="dropdown-pane"
    id="new-incident-dropdown"
    data-dropdown
    data-auto-focus="true"
    style="max-height: 200px; overflow-y: auto"
  >
  <div class="new-incident-form">
    <h4>Add New Incident</h4>
    <form @submit.prevent="addNewIncident">
      <label for="caseNumber">Case Number:</label>
      <input id="caseNumber" type="text" v-model="newIncident.case_number" required>

      <label for="date">Date:</label>
      <input id="date" type="date" v-model="newIncident.date" required>

      <label for="time">Time:</label>
      <input id="time" type="time" v-model="newIncident.time" required>

      <label for="code">Code:</label>
      <input id="code" type="text" v-model="newIncident.code" required>

      <label for="incident">Incident:</label>
      <input id="incident" type="text" v-model="newIncident.incident" required>

      <label for="police_grid">Police Grid:</label>
      <input id="police_grid" type="text" v-model="newIncident.police_grid" required>

      <label for="neighborhood_number">Neighborhood Number:</label>
      <input id="neighborhood_number" type="number" v-model="newIncident.neighborhood_number" required>

      <label for="block">Block:</label>
      <input id="block" type="text" v-model="newIncident.block" required>


      <button class="button" type="submit">Submit</button>
    </form>
  </div>
  </div>

  <div class="legend">
    <span class="legend-item violent-crime">Violent Crime</span>
    <span class="legend-item property-crime">Property Crime</span>
    <span class="legend-item other-crime">Other Crime</span>
  </div>

  <button class="button" type="button" data-toggle="example-dropdown">
    Toggle Dropdown Filters
  </button>
  <div
    class="dropdown-pane"
    id="example-dropdown"
    data-dropdown
    data-auto-focus="true"
    style="max-height: 200px; overflow-y: auto"
  >
    <div
      id="checkboxList"
      class="dropdown-panel"
      v-if="Object.keys(code_map).length > 0"
    >
      <label>Start Date</label>
      <input id="start_date" type="date" />
      <label>End Date</label>
      <input id="end_date" type="date" />
      <label>Max Cases (up to 1000)</label>
      <input
        id="max-incidents"
        type="range"
        min="0"
        max="1000"
        value="0"
        oninput="this.nextElementSibling.value = this.value"
      />
      <output>1000</output>
      <br />
      <label v-for="item in code_map"
        ><input type="checkbox" /> {{ item }}</label
      >
    </div>
  </div>
  
  <button
    id="filter"
    class="button success"
    type="button"
    @click="filterCrimes()"
    
  >
    Filter
  </button>

  <table class="unstriped" v-if="table.length > 0">
    <thead>
      <tr>
        <th>case_number</th>
        <th>incident_type</th>
        <th>incident</th>
        <th>police_grid</th>
        <th>neighborhood_name</th>
        <th>block</th>
        <th>date</th>
        <th>time</th>
        <th>view crime</th>
        <th>delete incident</th>
      </tr>
    </thead>
    <tbody>
      <template v-for="item in table" :key="item.case_number">
        <template v-if="neighborhood_array.includes(item.neighborhood_number)">
          <tr
            class="unstriped"
            :id="getClassForTableRow(item.incident_type.trim())"
          >
            <td>{{ item.case_number }}</td>

            <td>{{ item.incident_type }}</td>
            <td>{{ item.incident }}</td>
            <td>{{ item.grid }}</td>
            <td>{{ item.neighborhood }}</td>
            <td>{{ item.block }}</td>
            <td>{{ item.date }}</td>
            <td>{{ item.time }}</td>
            <td>
              <ToggleCrimeButton
                :address="item.block"
                :date="item.date"
                :time="item.time"
                :incident="item.incident"
                :case_number="item.case_number"
                :onSelect="selectCrime"
                :onUnselect="removeMarker"
              ></ToggleCrimeButton>
            </td>
            <td>
              <button
                class="button"
                type="button"
                @click="deleteIncident(item.case_number)"
              >
                Delete
              </button>
            </td>
          </tr>
        </template>
      </template>
    </tbody>
  </table>
</template>

<style>
#rest-dialog {
  width: 20rem;
  margin-top: 1rem;
  z-index: 1000;
}

#leafletmap {
  height: 500px;
}

.dialog-header {
  font-size: 1.2rem;
  font-weight: bold;
}

.dialog-label {
  font-size: 1rem;
}

.dialog-input {
  font-size: 1rem;
  width: 100%;
}

.dialog-error {
  font-size: 1rem;
  color: #d32323;
}

.red-icon {
  background-color: red;
}

#highlight-red {
  background-color: #ff4d4d;
}

#highlight-orange {
  background-color: #ffa500;
}

#highlight-yellow {
  background-color: lightgray;
}

.legend {
  margin-bottom: 1%;
}

.legend-item {
  margin-right: 1%;
  padding: 0.5%;
  border: 1px black;
}

.violent-crime {
  background-color: #ff4d4d;
}
.property-crime {
  background-color: #ffa500;
}
.other-crime {
  background-color: lightgray;
}

#highlight-orange {
  background-color: #ffa500;
}

#highlight-yellow {
  background-color: lightgray;
}

.legend {
  margin-bottom: 1%;
}

.legend-item {
  margin-right: 1%;
  padding: 0.5%;
  border: 1px black;
}

.violent-crime {
  background-color: #ff4d4d;
}
.property-crime {
  background-color: #ffa500;
}
.other-crime {
  background-color: lightgray;
}

.ui-row {
  display: inline-block;
  margin-right: 15px;
}

#checkboxList label {
  display: inline-block;
  margin-right: 10px;
}

#filter {
  margin-left: 10px;
}
</style>
