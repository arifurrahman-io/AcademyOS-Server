const moment = require('moment-timezone');

const TIMEZONE = "Asia/Dhaka";

exports.formatDate = (date) => {
  return moment(date).tz(TIMEZONE).format('DD-MM-YYYY');
};

exports.getDhakaTime = () => {
  return moment().tz(TIMEZONE).toDate();
};

exports.calculateDaysDifference = (startDate, endDate) => {
  const start = moment(startDate).tz(TIMEZONE);
  const end = moment(endDate).tz(TIMEZONE);
  return end.diff(start, 'days');
};