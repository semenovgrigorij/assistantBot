require("dotenv").config();
const text = require("./const");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const axios = require("axios");
const mindee = require("mindee");
const express = require("express");
const mutex = require("async-mutex").Mutex();
const mysql = require("mysql");
const botToken = process.env.BOT_TOKEN;
// Создаем экземпляр бота
const bot = new TelegramBot(botToken, { polling: true });

// Объект для хранения количества посещений каждого пользователя

const visitCount = {};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Счётчик посещений. Увеличиваем счетчик посещений для пользователя

  if (visitCount[userId]) {
    visitCount[userId]++;
  } else {
    visitCount[userId] = 1;
  }
  // const message = `Це Ваш ${visitCount[userId]} запит.`;
  // bot.sendMessage(chatId, message);

  bot.sendMessage(
    userId,
    `Вітаю, ${msg.from.first_name}! 
  Це Ваш ${visitCount[userId]} запит. 
Надішліть мені, будь ласка, першу сторону техпаспорта, як вказанo на зразку.`
  );
  const photo = await bot.sendPhoto(userId, "./img/photo.jpg");

  // Подключение к базе данных

  const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "root",
  });

  connection.connect((err) => {
    if (err) {
      console.error("Ошибка подключения к базе данных: " + err.stack);
      return;
    }
    console.log("Успешное подключение к базе данных");
  });

  // Инициализация Mindee клиента
  const mindeeClient = new mindee.Client({
    apiKey: "0a7d9287a965d36af34c34968360b01e",
  });

  let currentEndpoint = "prime_side"; // Изначально устанавливаем первый эндпоинт

  // Обработка полученного фото
  bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;
    const photoId = msg.photo[msg.photo.length - 1].file_id;
    const fileLink = await bot.getFileLink(photoId);

    // Загрузка файла из Telegram
    const inputSource = mindeeClient.docFromUrl(fileLink);

    // Создание кастомного эндпоинта для продукта
    const customEndpoint =
      currentEndpoint === "prime_side"
        ? mindeeClient.createEndpoint("prime_side", "Gorge-1973", "1")
        : mindeeClient.createEndpoint("second_side", "Gorge-1973", "1");

    // Обработка фото через Mindee
    const apiResponse = mindeeClient.parse(
      mindee.product.CustomV1,
      inputSource,
      {
        endpoint: customEndpoint,
        cropper: true,
      }
    );

    // Обработка результата от Mindee

    apiResponse.then(async (resp) => {
      const userData = resp.document.inference.prediction;
      console.log(resp.document.toString());
      bot.sendMessage(chatId, `${resp.document.inference.prediction}`);

      // Сообщение посетителю бота

      if (currentEndpoint === "prime_side") {
        bot.sendMessage(
          chatId,
          "Я отримав усі Ваші повідомлення та додав їх до бази даних. Дякую за співпрацю."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Добре, ${msg.from.first_name}! Надішліть мені, будь ласка, іншу сторону техпаспорта, як вказанo на цьому зразку.`
        );
        const foto = await bot.sendPhoto(chatId, "./img/foto.jpg");
      }

      // Полчение никнейма посетителя бота

      bot.getChat(userId).then((chat) => {
        const nickname = chat.username;
        console.log(`Никнейм пользователя: @${nickname}`);

        // Получение текущей даты и времени

        const currentDateTime = new Date().toISOString();

        // Сохранение результата и времени с датой в базу данных

        connection.query(
          "INSERT INTO document_prime_side SET ?",
          { userData: userData, date: currentDateTime, nickname: nickname },
          (err, result) => {
            if (err) throw err;
            console.log(
              "Результат и время с датой сохранены в базе данных. Никнейм успешно добавлен в базу данных"
            );
          }
        );
      });
    });
    // Переключение между эндпоинтами для следующего фото
    currentEndpoint =
      currentEndpoint === "prime_side" ? "second_side" : "prime_side";
  });
});
