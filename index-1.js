require("dotenv").config();
const text = require("./const");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const axios = require("axios");
const mindee = require("mindee");
const express = require("express");
const mutex = require("async-mutex").Mutex();
const botToken = process.env.BOT_TOKEN;
// Подключение к базе данных
const mysql = require('mysql');
const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'root'
});

// Открытие соединения
connection.connect((err) => {
  if (err) throw err;
  console.log('Соединение с базой данных установлено');
});

// Запрос к базе данных
connection.query('SELECT  \*  FROM document_prime_side', (err, result) => {
  if (err) throw err;
  console.log(result);
});


// Создаем экземпляр бота
const bot = new TelegramBot(botToken, { polling: true });

let isFirstFunctionCalled = false;
let isSecondFunctionCalled = false;
bot.onText(/\/start/, (msg, match) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Выберите команду:", {
    reply_markup: {
      keyboard: [[{ text: "/message1" }, { text: "/message2" }]],
      resize_keyboard: true,
    },
  });

  bot.onText(/\/message1/, async (ctx) => {
    bot.on("photo", (msg) => {
      // Получаем информацию о фото-файле
      const photo = msg.photo[msg.photo.length - 1];
      const file_id = photo.file_id;

      // Отправляем фото-файл на сервер Telegram и обрабатываем Promise
      bot.sendPhoto(chatId, file_id).then(() => {
        // Получаем информацию о сохраненном файле
        bot.getFile(file_id).then((file) => {
          const filePath = file.file_path;
          console.log("Путь к сохраненному файлу:", filePath);
          const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${filePath}`;
          console.log("URL сохраненного файла:", fileUrl);
          const mindeeClient = new mindee.Client({
            apiKey: "0a7d9287a965d36af34c34968360b01e",
          });
          const firstInputSource = mindeeClient.docFromUrl(fileUrl);
          const firstCustomEndpoint = mindeeClient.createEndpoint(
            "prime_side",
            "Gorge-1973"
          );
          mindeeClient
            .parse(
              mindee.product.CustomV1,
              firstInputSource,
              {
                endpoint: firstCustomEndpoint,
                cropper: true,
              },
              handleFirstApiResponse
            )
            .then((response) => {
              handleFirstApiResponse(response);
              isMessage1Processing = false;
            })
            .catch((error) => {
              console.error("Error parsing image:", error);
              isMessage1Processing = false;
            });
        });
      });
    });
    function handleFirstApiResponse(resp) {
      if (!isSecondFunctionCalled) {
        isFirstFunctionCalled = true;
        console.log(resp.document.toString());
        bot.sendMessage(chatId, `${resp.document.inference.prediction}`);
      }
    }
  });

  bot.onText(/\/message2/, async (ctx) => {
    bot.on("photo", (msg) => {
      // Получаем информацию о фото-файле
      const photo = msg.photo[msg.photo.length - 1];
      const file_Id = photo.file_id;

      // Отправляем фото-файл на сервер Telegram и обрабатываем Promise
      bot.sendPhoto(chatId, file_Id).then(() => {
        // Получаем информацию о сохраненном файле
        bot.getFile(file_Id).then((file) => {
          const filePath = file.file_path;
          console.log("Путь к сохраненному файлу:", filePath);
          const fileURl = `https://api.telegram.org/file/bot${bot.token}/${filePath}`;
          console.log("URL сохраненного файла:", fileURl);
          const mindeeClient = new mindee.Client({
            apiKey: "0a7d9287a965d36af34c34968360b01e",
          });
          const secondInputSource = mindeeClient.docFromUrl(fileURl);
          const secondCustomEndpoint = mindeeClient.createEndpoint(
            "second_side",
            "Gorge-1973"
          );

          mindeeClient
            .parse(
              mindee.product.CustomV1,
              secondInputSource,
              {
                endpoint: secondCustomEndpoint,
                cropper: true,
              },
              handleSecondApiResponse
            )
            .then((response) => {
              handleSecondApiResponse(response);
            })
            .catch((error) => {
              console.error("Error parsing image:", error);
            });
        });
      });
    });

    function handleSecondApiResponse(resp) {
      if (!isFirstFunctionCalled) {
        isSecondFunctionCalled = true;
        console.log(resp.document.toString());
        bot.sendMessage(chatId, `${resp.document.inference.prediction}`);
      }
    }
  });
});




const foto = await bot.sendPhoto(chatId, "./img/foto.jpg");
bot.sendMessage(
  chatId,
  `Добре, ${msg.from.first_name}! Надішліть мені, будь ласка, іншу сторону техпаспорта, як вказанo на цьому зразку.`
);
console.log(foto);
