// --- 1. SELEKSI ELEMEN DOM ---
// Mengambil semua elemen HTML yang akan dimanipulasi agar mudah diakses.
const cityInput = document.getElementById("city_input");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const currentWeatherCard = document.querySelector(".current-weather .details");
const weatherIcon = document.querySelector(".current-weather .weather-icon img");
const fiveDaysForecastCard = document.querySelector(".day-forecast");
const hourlyForecastContainer = document.querySelector(".hourly-forecast-container");
const suggestionsBox = document.querySelector(".search-suggestions");
const favoriteBtn = document.getElementById("favoriteBtn");
const favoritesList = document.getElementById("favoritesList");
const unitC = document.querySelector(".unit-c");
const unitF = document.querySelector(".unit-f");
const loadingOverlay = document.querySelector(".loading-overlay");
const themeToggle = document.getElementById("theme-toggle");
const body = document.body;

// Elemen-elemen untuk Today's Highlights
const airQualityStatus = document.getElementById("air-quality-status");
const pm2_5 = document.getElementById("pm2_5");
const pm10 = document.getElementById("pm10");
const so2 = document.getElementById("so2");
const co = document.getElementById("co");
const no2 = document.getElementById("no2");
const nh3 = document.getElementById("nh3");
const o3 = document.getElementById("o3");
const sunriseTime = document.getElementById("sunrise-time");
const sunsetTime = document.getElementById("sunset-time");
const humidity = document.getElementById("humidity");
const pressure = document.getElementById("pressure");
const visibility = document.getElementById("visibility");
const windSpeed = document.getElementById("wind-speed");
const feelsLike = document.getElementById("feels-like");

// --- 2. KONFIGURASI & VARIABEL GLOBAL ---
const API_KEY = "182ffc402e103d317219d0b1d67369b6"; // Kunci API untuk mengakses data OpenWeatherMap.

let currentCityName = ""; // Menyimpan nama kota yang sedang ditampilkan.
let currentUnit = "celsius"; // Menyimpan unit suhu saat ini ('celsius' atau 'fahrenheit').
let lastWeatherData = null; // Menyimpan data cuaca terakhir dari API (cache sementara).
let lastAqiData = null; // Menyimpan data polusi udara terakhir dari API.
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// --- 3. FUNGSI-FUNGSI TEMA ---
/**
 * Mengaktifkan tema terang (light theme).
 * Logikanya: Menambahkan class 'light-theme' ke body, mengubah ikon tombol,
 * dan menyimpan preferensi tema ke localStorage agar diingat.
 */
const enableLightTheme = () => {
  body.classList.add("light-theme");
  themeToggle.innerHTML = '<i class="fa-light fa-moon"></i>';
  localStorage.setItem("theme", "light");
};

/**
 * Mengaktifkan tema gelap (dark theme).
 */
const enableDarkTheme = () => {
  body.classList.remove("light-theme");
  themeToggle.innerHTML = '<i class="fa-light fa-sun"></i>';
  localStorage.setItem("theme", "dark");
};

// --- 4. FUNGSI-FUNGSI FORMAT DATA ---
/**
 * Mengonversi suhu dari Kelvin (default dari API) ke Celsius atau Fahrenheit.
 * @param {number} tempInKelvin - Suhu dalam Kelvin.
 * @returns {string} Suhu yang sudah diformat dengan simbol °C atau °F.
 */
const formatTemperature = (tempInKelvin) => {
  if (currentUnit === "celsius") {
    // Rumus Kelvin ke Celsius: K - 273.15
    return `${(tempInKelvin - 273.15).toFixed(1)}°C`;
  } else {
    // Rumus Kelvin ke Fahrenheit: (K - 273.15) * 1.8 + 32
    const tempInFahrenheit = (tempInKelvin - 273.15) * 1.8 + 32;
    return `${tempInFahrenheit.toFixed(1)}°F`;
  }
};

/**
 * Memformat suhu tertinggi dan terendah untuk tampilan prakiraan.
 */
const formatHighLowTemp = (maxK, minK) => {
  if (currentUnit === "celsius") {
    return `${(maxK - 273.15).toFixed(1)}° / ${(minK - 273.15).toFixed(1)}°`;
  } else {
    const maxF = (maxK - 273.15) * 1.8 + 32;
    const minF = (minK - 273.15) * 1.8 + 32;
    return `${maxF.toFixed(1)}° / ${minF.toFixed(1)}°`;
  }
};

// --- 5. FUNGSI-FUNGSI MANAJEMEN PENYIMPANAN (LocalStorage) ---

/**
 * Memuat dan menampilkan daftar lokasi favorit dari localStorage.
 * Logikanya: Mengambil data dari localStorage, mengubahnya dari string JSON ke array,
 * lalu membuat elemen div untuk setiap kota favorit dan menampilkannya di UI.
 */
const loadFavorites = () => {
  const favorites = JSON.parse(localStorage.getItem("weatherFavorites")) || [];
  favoritesList.innerHTML = "";
  if (favorites.length > 0) {
    favorites.forEach((city) => {
      const div = document.createElement("div");
      div.setAttribute("tabindex", "0"); // Untuk aksesibilitas
      div.innerHTML = `
        <span>${city}</span>
        <i class="fa-solid fa-trash remove-fav" onclick="event.stopPropagation(); removeFromFavorites('${city}')"></i>
      `;
      // Jika item favorit diklik, jalankan pencarian untuk kota tersebut.
      div.onclick = () => {
        cityInput.value = city;
        getCityCoordinates();
      };
      div.addEventListener("keydown", (e) => {
        if (e.key === "Enter") e.target.click();
      });
      favoritesList.appendChild(div);
    });
  } else {
    favoritesList.innerHTML = "<p>No favorite locations saved.</p>";
  }
};

/**
 * Menambah atau menghapus kota dari daftar favorit.
 * Logikanya: Cek apakah kota sudah ada di array favorit. Jika ya, hapus.
 * Jika tidak, tambahkan. Kemudian simpan kembali array yang sudah diperbarui ke localStorage.
 */
const toggleFavorite = () => {
  let favorites = JSON.parse(localStorage.getItem("weatherFavorites")) || [];
  const cityName = currentCityName;
  if (favorites.includes(cityName)) {
    // Gunakan .filter() untuk membuat array baru tanpa kota yang ingin dihapus.
    favorites = favorites.filter((fav) => fav !== cityName);
    favoriteBtn.classList.remove("active");
  } else {
    favorites.push(cityName);
    favoriteBtn.classList.add("active");
  }
  // Simpan kembali ke localStorage setelah diubah.
  localStorage.setItem("weatherFavorites", JSON.stringify(favorites));
  loadFavorites(); // Perbarui tampilan daftar favorit.
};

/**
 * Menghapus satu item dari daftar favorit.
 * @param {string} cityName - Nama kota yang akan dihapus.
 */
const removeFromFavorites = (cityName) => {
  let favorites = JSON.parse(localStorage.getItem("weatherFavorites")) || [];
  favorites = favorites.filter((fav) => fav !== cityName);
  localStorage.setItem("weatherFavorites", JSON.stringify(favorites));
  if (currentCityName === cityName) {
    favoriteBtn.classList.remove("active");
  }
  loadFavorites();
};

/**
 * Memeriksa apakah kota yang sedang ditampilkan ada di daftar favorit, lalu update ikon bintang.
 * @param {string} cityName - Nama kota yang akan diperiksa.
 */
const checkFavoriteStatus = (cityName) => {
  let favorites = JSON.parse(localStorage.getItem("weatherFavorites")) || [];
  if (favorites.includes(cityName)) {
    favoriteBtn.classList.add("active");
  } else {
    favoriteBtn.classList.remove("active");
  }
};

/**
 * Menyimpan kota yang dicari ke dalam riwayat pencarian di localStorage.
 * @param {string} cityName - Nama kota yang akan disimpan.
 */
const saveToHistory = (cityName) => {
  let history = JSON.parse(localStorage.getItem("weatherSearchHistory")) || [];
  // Hapus duplikat jika ada, agar kota yang baru dicari pindah ke atas.
  history = history.filter((item) => item.toLowerCase() !== cityName.toLowerCase());
  // Tambahkan kota baru di awal array.
  history.unshift(cityName);
  // Batasi riwayat hanya 5 item terakhir.
  if (history.length > 5) {
    history.pop();
  }
  localStorage.setItem("weatherSearchHistory", JSON.stringify(history));
};

/**
 * Menampilkan riwayat pencarian di kotak saran.
 */
const showHistory = () => {
  const history = JSON.parse(localStorage.getItem("weatherSearchHistory")) || [];
  suggestionsBox.innerHTML = "";
  if (history.length > 0) {
    history.forEach((city) => {
      const div = document.createElement("div");
      div.setAttribute("tabindex", "0");
      div.innerHTML = `<i class="fa-light fa-clock-rotate-left"></i> ${city}`;
      div.onclick = () => {
        cityInput.value = city;
        getCityCoordinates();
        suggestionsBox.style.display = "none";
      };
      div.addEventListener("keydown", (e) => {
        if (e.key === "Enter") e.target.click();
      });
      suggestionsBox.appendChild(div);
    });
    suggestionsBox.style.display = "block";
  }
};

/**
 * Mengambil dan menampilkan saran pencarian kota berdasarkan input pengguna.
 * @param {string} query - Teks yang diketik pengguna di input field.
 */
const getSuggestions = (query) => {
  // Jika input kosong, tampilkan riwayat.
  if (!query) {
    showHistory();
    return;
  }
  const GEOCODING_API_URL = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`;
  fetch(GEOCODING_API_URL)
    .then((res) => res.json())
    .then((data) => {
      suggestionsBox.innerHTML = "";
      if (data.length > 0) {
        data.forEach((item) => {
          const cityName = item.state ? `${item.name}, ${item.state}, ${item.country}` : `${item.name}, ${item.country}`;
          const div = document.createElement("div");
          div.setAttribute("tabindex", "0");
          div.textContent = cityName;
          div.onclick = () => {
            getWeatherDetails(item.name, item.lat, item.lon);
            suggestionsBox.style.display = "none";
          };
          div.addEventListener("keydown", (e) => {
            if (e.key === "Enter") e.target.click();
          });
          suggestionsBox.appendChild(div);
        });
        suggestionsBox.style.display = "block";
      } else {
        suggestionsBox.style.display = "none";
      }
    });
};

// --- 6. FUNGSI-FUNGSI PEMBUAT KARTU (HTML String Builders) ---

/**
 * Membuat string HTML untuk kartu cuaca saat ini.
 * @param {string} cityName - Nama kota.
 * @param {object} weatherItem - Objek data cuaca untuk saat ini.
 * @returns {string} String HTML yang siap dimasukkan ke dalam DOM.
 */
const createCurrentWeatherCard = (cityName, weatherItem) => {
  const date = new Date(weatherItem.dt * 1000);
  const day = days[date.getDay()];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  weatherIcon.src = `https://openweathermap.org/img/wn/${weatherItem.weather[0].icon}@2x.png`;
  weatherIcon.alt = weatherItem.weather[0].description;

  return `
        <h2>${formatTemperature(weatherItem.main.temp)}</h2>
        <p>${weatherItem.weather[0].description}</p>
        <div class="high-low-temp">
            <p><i class="fa-light fa-arrow-up"></i> H: ${formatTemperature(weatherItem.main.temp_max)}</p>
            <p><i class="fa-light fa-arrow-down"></i> L: ${formatTemperature(weatherItem.main.temp_min)}</p>
        </div>
        <hr/>
        <div class="card-footer">
            <p><i class="fa-light fa-calendar"></i> ${day}, ${date.getDate()} ${month} ${year}</p>
            <p><i class="fa-light fa-location-dot"></i> ${cityName}</p>
        </div>
    `;
};

/**
 * Membuat string HTML untuk satu item kartu prakiraan 5 hari.
 */
const createForecastCard = (weatherItem, cityName) => {
  const date = new Date(weatherItem.dt * 1000);
  const day = days[date.getDay()];
  const weatherItemJSON = JSON.stringify(weatherItem);

  return `
        <div class="forecast-item" tabindex="0" onclick='updateCurrentWeather(${weatherItemJSON}, "${cityName}")' onkeydown='if(event.key==="Enter") this.click()'>
            <div class="icon-wrapper">
                <img src="https://openweathermap.org/img/wn/${weatherItem.weather[0].icon}.png" alt="${weatherItem.weather[0].description}" />
            </div>
            <p>${day}</p>
            <p class="day-temp">${formatHighLowTemp(weatherItem.main.temp_max, weatherItem.main.temp_min)}</p>
        </div>
    `;
};

/**
 * Membuat string HTML untuk satu item prakiraan per jam.
 */
const createHourlyForecastItem = (hourlyItem) => {
  const date = new Date(hourlyItem.dt * 1000);
  const hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;

  return `
        <div class="hourly-item">
            <p>${formattedHours} ${ampm}</p>
            <img src="https://openweathermap.org/img/wn/${hourlyItem.weather[0].icon}.png" alt="${hourlyItem.weather[0].description}" />
            <span>${formatTemperature(hourlyItem.main.temp)}</span>
        </div>
    `;
};

// --- 7. FUNGSI-FUNGSI PEMBARUAN UI (DOM Manipulation) ---

/**
 * Memperbarui semua data di kartu "Today's Highlights".
 * @param {object} weatherData - Objek data cuaca dari API.
 * @param {object} aqiData - Objek data polusi udara dari API.
 */
const updateHighlights = (weatherData, aqiData) => {
  const current = weatherData.list[0];
  const sunrise = new Date(weatherData.city.sunrise * 1000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const sunset = new Date(weatherData.city.sunset * 1000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  humidity.textContent = `${current.main.humidity}%`;
  pressure.textContent = `${current.main.pressure} hPa`;
  visibility.textContent = `${(current.visibility / 1000).toFixed(1)} km`;
  windSpeed.textContent = `${current.wind.speed} m/s`;
  feelsLike.textContent = formatTemperature(current.main.feels_like);
  sunriseTime.textContent = sunrise;
  sunsetTime.textContent = sunset;

  if (aqiData && aqiData.list && aqiData.list.length > 0) {
    const aqi = aqiData.list[0].main.aqi;
    let status = "";
    switch (aqi) {
      case 1:
        status = "Good";
        break;
      case 2:
        status = "Fair";
        break;
      case 3:
        status = "Moderate";
        break;
      case 4:
        status = "Poor";
        break;
      case 5:
        status = "Very Poor";
        break;
      default:
        status = "--";
    }
    airQualityStatus.textContent = status;
    airQualityStatus.className = `bad ${status.toLowerCase().replace(" ", "-")}`;
    const components = aqiData.list[0].components;
    pm2_5.textContent = components.pm2_5.toFixed(1);
    pm10.textContent = components.pm10.toFixed(1);
    so2.textContent = components.so2.toFixed(1);
    co.textContent = components.co.toFixed(1);
    no2.textContent = components.no2.toFixed(1);
    nh3.textContent = components.nh3.toFixed(1);
    o3.textContent = components.o3.toFixed(1);
  }
};

/**
 * Fungsi "master" untuk merender semua data cuaca ke UI.
 * @param {string} cityName - Nama kota yang akan ditampilkan.
 */
const displayWeatherData = (cityName) => {
  if (!lastWeatherData) return;

  // Logika untuk filter prakiraan 5 hari:
  // API memberikan data per 3 jam, jadi kita harus memfilter agar hanya mendapat satu data unik per hari.
  const uniqueForecastDays = [];
  const fiveDaysForecast = lastWeatherData.list.filter((forecast) => {
    const forecastDate = new Date(forecast.dt_txt).getDate();
    if (!uniqueForecastDays.includes(forecastDate)) {
      return uniqueForecastDays.push(forecastDate);
    }
  });

  // Filter untuk prakiraan per jam khusus hari ini.
  const today = new Date().getDate();
  const hourlyForecast = lastWeatherData.list.filter((forecast) => {
    return new Date(forecast.dt_txt).getDate() === today;
  });

  // Memanggil fungsi pembuat kartu untuk mengisi konten HTML.
  currentWeatherCard.innerHTML = createCurrentWeatherCard(cityName, lastWeatherData.list[0]);

  fiveDaysForecastCard.innerHTML = "<h2>5 days Forecast</h2>";
  fiveDaysForecast.forEach((weatherItem) => {
    fiveDaysForecastCard.innerHTML += createForecastCard(weatherItem, lastWeatherData.city.name);
  });

  hourlyForecastContainer.innerHTML = "";
  hourlyForecast.forEach((hourlyItem) => {
    hourlyForecastContainer.innerHTML += createHourlyForecastItem(hourlyItem);
  });

  updateHighlights(lastWeatherData, lastAqiData);
};

// --- 8. FUNGSI-FUNGSI INTI & PEMANGGILAN API ---

/**
 * Fungsi utama untuk mendapatkan detail cuaca dan polusi udara.
 * @param {string} cityName - Nama kota.
 * @param {number} lat - Latitude (garis lintang).
 * @param {number} lon - Longitude (garis bujur).
 */
const getWeatherDetails = (cityName, lat, lon) => {
  loadingOverlay.classList.add("active"); // Tampilkan spinner

  const WEATHER_API_URL = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
  const AIR_POLLUTION_API_URL = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

  // Promise.all menunggu semua promise di dalamnya selesai, membuatnya lebih efisien.
  Promise.all([fetch(WEATHER_API_URL).then((res) => res.json()), fetch(AIR_POLLUTION_API_URL).then((res) => res.json())])
    .then(([weatherData, aqiData]) => {
      if (weatherData.cod !== "200") {
        throw new Error(weatherData.message || "Could not fetch weather data.");
      }

      // Simpan data ke variabel global
      currentCityName = cityName;
      lastWeatherData = weatherData;
      lastAqiData = aqiData;

      // Simpan data ke localStorage sebagai cache untuk loading cepat
      const cache = {
        weather: weatherData,
        aqi: aqiData,
        city: cityName,
        timestamp: new Date().getTime(),
      };
      localStorage.setItem("weatherCache", JSON.stringify(cache));

      // Panggil fungsi-fungsi lain setelah data berhasil didapat
      saveToHistory(cityName);
      checkFavoriteStatus(cityName);
      displayWeatherData(cityName);
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      alert(error.message || "An error occurred while fetching new data!");
    })
    .finally(() => {
      loadingOverlay.classList.remove("active"); // Sembunyikan spinner, baik berhasil maupun gagal.
    });
};

/**
 * Mendapatkan koordinat (lat, lon) dari nama kota menggunakan Geocoding API.
 */
const getCityCoordinates = () => {
  const cityName = cityInput.value.trim();
  if (!cityName) return;
  const GEOCODING_API_URL = `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${API_KEY}`;
  loadingOverlay.classList.add("active");
  fetch(GEOCODING_API_URL)
    .then((res) => res.json())
    .then((data) => {
      if (!data.length) {
        loadingOverlay.classList.remove("active");
        return alert(`No coordinates found for ${cityName}`);
      }
      const { name, lat, lon } = data[0];
      // Jika koordinat ditemukan, panggil fungsi untuk mendapatkan data cuaca.
      getWeatherDetails(name, lat, lon);
    })
    .catch(() => {
      loadingOverlay.classList.remove("active");
      alert("An error occurred while fetching the coordinates!");
    });
};

/**
 * Mendapatkan lokasi pengguna saat ini menggunakan Geolocation API browser.
 */
const getUserCoordinates = () => {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      // Gunakan Reverse Geocoding API untuk mendapatkan nama kota dari koordinat.
      const REVERSE_GEOCODING_URL = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`;
      loadingOverlay.classList.add("active");
      fetch(REVERSE_GEOCODING_URL)
        .then((res) => res.json())
        .then((data) => {
          if (!data.length) {
            loadingOverlay.classList.remove("active");
            return alert("Could not determine city name from coordinates.");
          }
          const { name } = data[0];
          getWeatherDetails(name, latitude, longitude);
        })
        .catch(() => {
          loadingOverlay.classList.remove("active");
          alert("An error occurred while fetching the city from coordinates!");
        });
    },
    (error) => {
      // Jika pengguna menolak izin lokasi, load favorit sebagai gantinya.
      if (error.code === error.PERMISSION_DENIED) {
        loadFavorites();
      }
    }
  );
};

/**
 * Memperbarui kartu cuaca saat ini ketika salah satu item prakiraan 5 hari diklik.
 * @param {object} data - Objek data cuaca dari item yang diklik.
 * @param {string} cityName - Nama kota.
 */
const updateCurrentWeather = (data, cityName) => {
  currentWeatherCard.innerHTML = createCurrentWeatherCard(cityName, data);
};

// --- 9. EVENT LISTENERS ---
// Menambahkan "pendengar" untuk setiap aksi pengguna (klik, ketik, dll).

locationBtn.addEventListener("click", getUserCoordinates);
searchBtn.addEventListener("click", getCityCoordinates);
favoriteBtn.addEventListener("click", toggleFavorite);

unitC.addEventListener("click", () => {
  if (currentUnit === "celsius") return;
  currentUnit = "celsius";
  unitC.classList.add("active");
  unitF.classList.remove("active");
  localStorage.setItem("weatherUnit", "celsius");
  // Tampilkan ulang data dengan unit baru tanpa memanggil API lagi.
  displayWeatherData(currentCityName);
});

unitF.addEventListener("click", () => {
  if (currentUnit === "fahrenheit") return;
  currentUnit = "fahrenheit";
  unitF.classList.add("active");
  unitC.classList.remove("active");
  localStorage.setItem("weatherUnit", "fahrenheit");
  displayWeatherData(currentCityName);
});

themeToggle.addEventListener("click", () => {
  if (body.classList.contains("light-theme")) {
    enableDarkTheme();
  } else {
    enableLightTheme();
  }
});

// Event listener yang berjalan saat seluruh halaman HTML selesai dimuat.
document.addEventListener("DOMContentLoaded", () => {
  // Memuat preferensi tema dan unit dari localStorage.
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    enableLightTheme();
  } else {
    enableDarkTheme();
  }

  const savedUnit = localStorage.getItem("weatherUnit");
  if (savedUnit === "fahrenheit") {
    currentUnit = "fahrenheit";
    unitF.classList.add("active");
    unitC.classList.remove("active");
  } else {
    currentUnit = "celsius";
    unitC.classList.add("active");
    unitF.classList.remove("active");
  }

  loadFavorites();

  // Cek apakah ada data cache yang valid di localStorage.
  const cachedData = localStorage.getItem("weatherCache");
  if (cachedData) {
    const cache = JSON.parse(cachedData);
    const cacheAgeMinutes = (new Date().getTime() - cache.timestamp) / 1000 / 60;

    // Jika cache masih baru (kurang dari 30 menit), gunakan data cache.
    if (cacheAgeMinutes < 30) {
      console.log("Loading data from cache.");
      currentCityName = cache.city;
      lastWeatherData = cache.weather;
      lastAqiData = cache.aqi;
      checkFavoriteStatus(currentCityName);
      displayWeatherData(currentCityName);
      return; // Hentikan eksekusi agar tidak memanggil API lagi.
    }
  }

  // Jika tidak ada cache, coba dapatkan lokasi pengguna secara otomatis.
  getUserCoordinates();
});

cityInput.addEventListener("click", showHistory);
cityInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    getCityCoordinates();
    suggestionsBox.style.display = "none";
  } else {
    // Panggil fungsi saran saat pengguna mengetik.
    getSuggestions(cityInput.value);
  }
});

// Sembunyikan kotak saran jika pengguna mengklik di luar area input/saran.
document.addEventListener("click", (e) => {
  if (!cityInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
    suggestionsBox.style.display = "none";
  }
});
