import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { html, raw } from "hono/html"
import dotenv from "dotenv"
import { parse } from "marked"
import fs from"node:fs"
import { getWeather } from "./api.js"
import { generate } from "./groq.js"

dotenv.config();

const app = new Hono()

// Middleware
app.use(async function (ctx, next) {
  ctx.setRenderer(function (content) {
    const template = fs
      .readFileSync("./template.html", "utf-8")
      .replace("{{content}}", content)
    
    return ctx.html(template);
  });
  await next();
})

app.get('/', async(c) => {
  let location = c.req.query("location") || "Jakarta";
  let data = await getWeather(location);
  let prompt = `
    You are an assistant for Weather App
    Please help user to get recommendation on suitable activities, clothes, tools and preparation.

    Here are the details of the weather
    - Location : ${location}
    - Temperature : ${data.temp}
    - Humidity : ${data.humidity}
    - Description : ${data.description}
    - Max Temperature : ${data.tempmax}

    Make the report short and engaging!
  `
  let responseLLM = await generate(prompt);
  let htmlResponse = parse(responseLLM);
  
  let objImage = {
    Jakarta: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Busway_in_Bundaran_HI.jpg/1200px-Busway_in_Bundaran_HI.jpg",
    Batam: "https://facts.net/wp-content/uploads/2023/07/35-facts-about-batam-1688736840.jpg",
    Yogyakarta: "https://imagedelivery.net/0LMYosKeo5o-LXOCjdKUuA/tourscanner.com/2023/09/Malioboro-Road-Yogyakarta.jpg/w=9999"
  };

  let sourceImage = objImage[location];

  return c.render(
    html`
      <img src="${sourceImage}" alt="${location}"/>
      <table>
        <tr>
          <td>Location</td>
          <td>${location}</td>
        </tr>
        <tr>
          <td>Temperature</td>
          <td>${data.temp}</td>
        </tr>
      </table>
      ${raw(htmlResponse)}
    `
  );
})

const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
