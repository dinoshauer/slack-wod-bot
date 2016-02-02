import request from 'request-promise';
import axios from 'axios';
import moment from 'moment';

const _getOpts = ( path => {
  const cfcSession = process.env.CFC_SESSION;
  const csrfToken = process.env.CSRF_TOKEN;
  return {
    url: 'http://www.crossfitcopenhagen.dk/booking_gateway',
    method: 'post',
    headers: {
      'Cookie': `_crossfitdk_session=${cfcSession};`,
      'X-CSRF-Token': `${csrfToken}`,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
    },
    data: path
  };
});

const _parseTime = (time) => parseInt(time.replace(/\/Date\((\d+)\)\//, '$1'));

const _getAttendees = ((resId, timestamp) => {
  return axios(_getOpts(`RessourceId=${resId}&Timestamp=${timestamp}&Duration=3600&path=GetListOfPeopleBooked`));
});

export const getBoxes = () => {
  const path = 'path=jGetCenterAllowedToBook';
  return axios(_getOpts(path));
}

export const getBookings = () => axios(_getOpts('path=GetBookings'))
  .then(( { data } ) => {
    return Promise.all(data.d.map( booking => {
      const rawTime = _parseTime(booking.StartDateTime);
      return _getAttendees(booking.RessourceId, rawTime)
        .then( attendees => {
          return {
            name: booking.Name,
            location: booking.CenterName,
            startTime: moment(rawTime),
            duration: moment.duration(booking.Duration, 's'),
            cancelBefore: moment.duration(booking.CancelBookingBefore, 's'),
            capacity: booking.Capacity,
            attendees: attendees.data.d
          }
        });
    }));
  });
