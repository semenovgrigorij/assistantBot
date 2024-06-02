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
const mysql = require("mysql");

// Создаем экземпляр бота
const bot = new TelegramBot(botToken, { polling: true });



let isFirstFunctionCalled = false;
let isSecondFunctionCalled = false;
bot.onText(/\/start/, async (ctx) => {
  const chatId = ctx.chat.id;
  bot.sendMessage(chatId, "Выберите команду:", {
    reply_markup: {
      keyboard: [
        [{ text: "/message1" }, { text: "/message2" }],
        [{ text: "Закрыть сессию", request_contact: true }],
      ],
      resize_keyboard: true,
    },
  });


    bot.on("photo", msg => {
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
        console.log(resp.document.inference.pages.prediction);
        bot.sendMessage(chatId, `${resp.document.inference.prediction}`);
      }

      // Добавьте следующий код для сохранения данных в базу данных
      const userData = resp.document.inference.prediction;

      // Подключение к базе данных
      const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "root",
      });

      // Открытие соединения
      connection.connect((err) => {
        if (err) throw err;
        console.log("Соединение с базой данных установлено");
      });

      // Запрос к базе данных
      connection.query(
        "INSERT INTO document_prime_side SET ?",
        { userData: userData },
        (err, result) => {
          if (err) throw err;
          console.log(result);
        }
      );
    }
  });

bot.onText(/\/star/, async (ctx) => {
  const chatId = ctx.chat.id;

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
    // Добавьте следующий код для сохранения данных в базу данных
    const userDatas = resp.document.inference.prediction;

    // Подключение к базе данных
    const connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "root",
    });

    // Открытие соединения
    connection.connect((err) => {
      if (err) throw err;
      console.log("Соединение с базой данных установлено");
    });

    // Запрос к базе данных
    connection.query(
      "INSERT INTO document_prime_side SET ?",
      { userDatas: userDatas },
      (err, result) => {
        if (err) throw err;
        console.log(result);
      }
    );
  }
});

bot.on("contact", (ctx) => {
  console.log("Пользователь предоставил свои контактные данные");
  bot.leaveChat(chatId);
  bot.sendMessage(
    chatId,
    "Сессия закрыта, нажмите /start для начала новой сессии"
  );
});
