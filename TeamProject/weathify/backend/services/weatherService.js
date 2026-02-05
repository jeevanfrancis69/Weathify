const axios = require('axios');
require('dotenv').config();

/**
 * Weather Service - Fetches weather data from OpenWeatherMap API
 */
class WeatherService {
  
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
  }
  
  /**
   * Get weather by coordinates
   * @param {Number} lat - Latitude
   * @param {Number} lon - Longitude
   */
  async getWeatherByCoordinates(lat, lon) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });
      
      return this.parseWeatherData(response.data);
      
    } catch (error) {
      console.error('Weather API error:', error.message);
      throw new Error('Failed to fetch weather data');
    }
  }
  
  /**
   * Get weather by city name
   * @param {String} city - City name
   */
  async getWeatherByCity(city) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          q: city,
          appid: this.apiKey,
          units: 'metric'
        }
      });
      
      return this.parseWeatherData(response.data);
      
    } catch (error) {
      console.error('Weather API error:', error.message);
      throw new Error('Failed to fetch weather data');
    }
  }
  
  /**
   * Parse and normalize weather data
   */
  parseWeatherData(data) {
    const weatherCondition = data.weather[0].main; // Clear, Clouds, Rain, etc.
    const description = data.weather[0].description;
    const temperature = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    
    return {
      condition: this.normalizeCondition(weatherCondition),
      description,
      temperature,
      feelsLike,
      humidity: data.main.humidity,
      city: data.name,
      country: data.sys.country,
      icon: data.weather[0].icon,
      raw: weatherCondition
    };
  }
  
  /**
   * Normalize weather condition to match database values
   */
  normalizeCondition(condition) {
    const conditionMap = {
      'Clear': 'Clear',
      'Clouds': 'Clouds',
      'Rain': 'Rain',
      'Drizzle': 'Drizzle',
      'Thunderstorm': 'Thunderstorm',
      'Snow': 'Snow',
      'Mist': 'Mist',
      'Fog': 'Fog',
      'Haze': 'Mist',
      'Smoke': 'Mist',
      'Dust': 'Mist',
      'Sand': 'Mist',
      'Ash': 'Mist',
      'Squall': 'Thunderstorm',
      'Tornado': 'Thunderstorm'
    };
    
    return conditionMap[condition] || 'Clear';
  }
  
  /**
   * Determine current season based on date and hemisphere
   * @param {String} hemisphere - 'north' or 'south'
   */
  getCurrentSeason(hemisphere = 'north') {
    const month = new Date().getMonth(); // 0-11
    
    if (hemisphere === 'north') {
      if (month >= 2 && month <= 4) return 'Spring';
      if (month >= 5 && month <= 7) return 'Summer';
      if (month >= 8 && month <= 10) return 'Autumn';
      return 'Winter';
    } else {
      // Southern hemisphere - seasons are reversed
      if (month >= 2 && month <= 4) return 'Autumn';
      if (month >= 5 && month <= 7) return 'Winter';
      if (month >= 8 && month <= 10) return 'Spring';
      return 'Summer';
    }
  }
  
  /**
   * Determine current time period
   */
  getCurrentTimePeriod() {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour <= 11) return 'Morning';
    if (hour >= 12 && hour <= 16) return 'Afternoon';
    if (hour >= 17 && hour <= 20) return 'Evening';
    return 'Night';
  }
  
  /**
   * Get complete context for recommendations
   */
  async getContext(lat, lon, hemisphere = 'north') {
    const weather = await this.getWeatherByCoordinates(lat, lon);
    const season = this.getCurrentSeason(hemisphere);
    const timePeriod = this.getCurrentTimePeriod();
    
    return {
      weather: weather.condition,
      weatherDetails: weather,
      season,
      timePeriod,
      timestamp: new Date()
    };
  }
}

module.exports = new WeatherService();
