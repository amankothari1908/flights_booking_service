const axios = require("axios");
const db = require("../models");
const { ServerConfig } = require("../config");
const { StatusCodes } = require("http-status-codes");
const AppError = require("../utils/errors/app.error");
const { BookingRepository } = require("../repositories");
const { Enums } = require("../utils/common");
const { BOOKED, CANCELLED } = Enums.BOOKING_STATUS;

const bookingRepository = new BookingRepository();

async function createBooking(data) {
  const transaction = await db.sequelize.transaction();
  try {
    const flight = await axios.get(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`
    );
    const flightData = flight.data.data;

    // Sample logic: check if seats are available
    if (data.noOfSeats > flightData.totalSeats) {
      throw new AppError("Not enough seats available", StatusCodes.BAD_REQUEST);
    }

    const totalBillingAmount = data.noOfSeats * flightData.price;
    const bookingPayload = { ...data, totalCost: totalBillingAmount };

    const booking = await bookingRepository.create(bookingPayload, transaction);

    await axios.patch(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`,
      {
        seats: data.noOfSeats,
      }
    );

    await transaction.commit();
    return booking;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function makePayment(data) {
  const transaction = await db.sequelize.transaction();
  try {
    console.log("INSIDE MAKE PAYMENET");

    const bookingDetails = await bookingRepository.get(
      data.bookingId,
      transaction
    );

    if (bookingDetails.status == CANCELLED) {
      throw new AppError("The Booking is Expired", StatusCodes.BAD_REQUEST);
    }

    const bookingTime = new Date(bookingDetails.createdAt);
    const currentTime = new Date();

    if (currentTime - bookingTime > 300000) {
      await cancelBooking(data.bookingId);
      throw new AppError("The Booking is Expired", StatusCodes.BAD_REQUEST);
    }

    console.log("bookingDetails.totalCost", bookingDetails.totalCost);
    console.log("data.totalCost", data.totalCost);

    if (bookingDetails.totalCost !== data.totalCost) {
      throw new AppError(
        "The amount of the payment doesnot match",
        StatusCodes.BAD_REQUEST
      );
    }

    if (bookingDetails.userId !== data.userId) {
      throw new AppError(
        "The user of the booking doesnot match",
        StatusCodes.BAD_REQUEST
      );
    }

    // payment is succesfully
    await bookingRepository.update(data.bookingId, {
      status: BOOKED,
      transaction,
    });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw new AppError(
      "Something went wrong in Payment",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}

async function cancelBooking(bookingId) {
  const transaction = await db.sequelize.transaction();
  try {
    const bookingDetails = await bookingRepository.get(bookingId, transaction);

    if (bookingDetails.status == CANCELLED) {
      await transaction.commit();
      return true;
    }

    console.log("HIEEE");

    await axios.patch(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${bookingDetails.flightId}/seats`,
      {
        seats: bookingDetails.noOfSeats,
        decrement: 0,
      }
    );

    console.log("HIEEE2");

    await bookingRepository.update(bookingId, {
      status: CANCELLED,
      transaction,
    });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw new AppError(
      "Something went wrong in Payment",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}

module.exports = {
  createBooking,
  makePayment,
};
