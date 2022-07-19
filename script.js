'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

////////////////////////////////////////////
class Workout {
  date = new Date();
  id = Date.now() + '';

  constructor(distance, duration, coordinates) {
    this.distance = distance;
    this.duration = duration;
    this.coordinates = coordinates;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(distance, duration, coordinates, cadence) {
    super(distance, duration, coordinates);
    this.cadence = cadence;
    this.calcPace();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, duration, coordinates, elevationGain) {
    super(distance, duration, coordinates);
    this.elevationGain = elevationGain;
    this.calcSpeed();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/////////////////////////////////////////////
class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    (() => this._getPosition())();
    // choose the type of the workout
    inputType.addEventListener('change', this._toggleElevationField);
    form.addEventListener('submit', this._newWorkOut.bind(this));
    containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));
    containerWorkouts.addEventListener('click', this._delete.bind(this));

    // setTimeout(() => this._loadDataFromLocalStorage(), 6000);
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert("Couldn't get your position");
      }
    );
  }

  _loadMap(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const coordinates = [latitude, longitude];
    this.#map = L.map('map').setView(coordinates, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(coordinates)
      .addTo(this.#map)
      .bindPopup('You are here')
      .openPopup();

    this.#map.on('click', this._showForm.bind(this));

    this._loadDataFromLocalStorage();
  }

  _showForm(event) {
    this.#mapEvent = event;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkOut(e) {
    e.preventDefault();
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    function validInputs(...inputs) {
      return inputs.every(input => Number.isFinite(input));
    }

    function positiveInputs(...inputs) {
      return inputs.every(input => input > 0);
    }
    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // if workout running: create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !positiveInputs(distance, duration, cadence)
      )
        return;
      workout = new Running(distance, duration, [lat, lng], cadence);
    }

    // if workout cycling: create cycling object
    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, elevationGain) ||
        !positiveInputs(distance, duration)
      )
        return;
      workout = new Cycling(distance, duration, [lat, lng], elevationGain);
    }

    // add new object to workout array
    this.#workouts.push(workout);

    // render workout on map as marker
    this._renderWorkoutOnMap(workout);

    // render workout on list
    this._renderWorkoutOnList(workout);

    // Hide form and clear the input fields
    this._hideForm();

    // send data to localStorage
    this._sendDataToLocaleStorage(this.#workouts);

    const del = document.querySelectorAll('.delete');
    del.forEach(d => {
      d.addEventListener('click', this._delete.bind(this));
    });
  }

  _renderWorkoutOnMap(workout) {
    const [lat, lng] = workout.coordinates;
    const popup = L.popup({
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,
    })
      .setLatLng([lat, lng])
      .setContent(
        `<span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__title">${
          workout.type === 'running' ? 'Running' : 'Cycling'
        } on ${
          months[workout.date.getMonth()]
        } ${workout.date.getDate()}</span>`
      )
      .openOn(this.#map);
    L.marker([lat, lng]).addTo(this.#map).bindPopup(popup).openPopup();
  }

  _renderWorkoutOnList(workout) {
    const html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <span class="delete">X</span>
      <h2 class="workout__title">${
        workout.type === 'running' ? 'Running' : 'Cycling'
      } on ${months[workout.date.getMonth()]} ${workout.date.getDate()}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${
          workout.type === 'running'
            ? Math.round(workout.pace * 10) / 10
            : Math.round(workout.speed * 10) / 10
        }</span>
        <span class="workout__unit">${
          workout.type === 'running' ? 'min/km' : 'km/h'
        }</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🦶🏼' : '⛰'
        }</span>
        <span class="workout__value">${
          workout.type === 'running' ? workout.cadence : workout.elevationGain
        }</span>
        <span class="workout__unit">${
          workout.type === 'running' ? 'spm' : 'm'
        }</span>
      </div>
    </li>`;
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToMarker(e) {
    const workout = e.target.closest('.workout');
    if (!workout || e.target.className == 'delete') return;
    const work = this.#workouts.find(work => work.id === workout.dataset.id);
    this.#map.setView(work.coordinates, 13, {
      animate: true,
      duration: 1,
    });
  }

  _delete(e) {
    const workout = e.target.closest('.workout');
    if (!(e.target.className == 'delete')) return;
    const work = this.#workouts.find(work => work.id === workout.dataset.id);
    this.#workouts = this.#workouts.filter(
      work => work.id !== workout.dataset.id
    );
    this._sendDataToLocaleStorage(this.#workouts);
    location.reload();
  }

  _sendDataToLocaleStorage(workouts) {
    window.localStorage.setItem('workouts', JSON.stringify(workouts));
  }

  _getDataFromLocaleStorage() {
    return JSON.parse(window.localStorage.getItem('workouts'));
  }

  _loadDataFromLocalStorage() {
    const data = this._getDataFromLocaleStorage();
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(workout => {
      workout.date = new Date(workout.date);
      this._renderWorkoutOnMap(workout);
      this._renderWorkoutOnList(workout);
    });
  }
}

let app = new App();
