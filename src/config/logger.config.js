import winston from "winston";

const allowedTransports = [];

// Below transport configuration enabled logging in console
allowedTransports.push(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss",
      }),
      //second arguemnt to the combine method, what is excitly going to printed in log
      winston.format.printf(
        (log) => `${log.timestamp} [${log.level}] : ${log.message}`
      )
    ),
  })
);

// Below transport configuration enabled logging in file system
allowedTransports.push(
  new winston.transports.File({
    filename: "app.log",
  })
);

const logger = winston.createLogger({
  format: winston.format.combine(
    //first argument to the combine method is defining how we want timestamp to come up
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    //second arguemnt to the combine method, what is excitly going to printed in log
    winston.format.printf(
      (log) => `${log.timestamp} [${log.level.toUpperCase()}] : ${log.message}`
    )
  ),
  transports: allowedTransports,
});

export default logger;
