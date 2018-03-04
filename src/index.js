import axios from 'axios';
import './styles/main.css';

const siteTitle = document.querySelector('h1');
const siteDescription = document.querySelector('.description');

axios.get(`${process.env.API_URL}/api/site`).then((response) => {
  siteTitle.innerHTML = response.data.title;
  siteDescription.innerHTML = response.data.description;
}).catch(error => console.log(error));

console.log('hello world');
