import axios from 'axios';
import moment from 'moment';
import 'moment-range';

const _getOpts = (
  path,
  cfcSession = process.env.CFC_SESSION,
  csrfToken = process.env.CSRF_TOKEN
) => (
  {
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
  }
);

const _parseTime = (time) => parseInt(time.replace(/\/Date\((\d+)\)\//, '$1'));

const _getAttendees = (
  resId,
  timestamp,
  path = `RessourceId=${resId}&Timestamp=${timestamp}&Duration=3600&path=GetListOfPeopleBooked`
) => (
  axios(_getOpts(path))
    .then(( { data } ) => data.d )
);

export const getBoxes = (path = 'path=jGetCenterAllowedToBook') => (
  axios(_getOpts(path))
    .then(( { data } ) => data.d.map(box => (
      {
        id: box.Id,
        name: box.Name
      }
    )))
);

export const getEventsForBox = (
  boxId,
  timestamp = moment().format('x'),
  path = `Timestamp=${timestamp}&CenterID=${boxId}&path=jGetEvents`
) => (
  axios(_getOpts(path))
    .then(({ data }) => {
      return data.d
    })
);

export const _filterEvents = (name, range, events) => (
  Promise.all(
    events.filter( event => {
      const startTime = moment(_parseTime(event.StartDateTime));
      const title = event.Title.toLowerCase();
      return title.includes(name) && startTime.within(range);
    })
  )
);

export const _parseEvent = (event, box) => (
  {
    title: event.Title,
    capacity: event.Capacity,
    freeSpace: event.FreeSpace,
    box: box.name,
    startTime: moment(_parseTime(event.StartDateTime)),
  }
);

export const getOpenSpotsForDay = (
  name,
  range,
  boxes,
  timestamp = moment().format('x')
) => (
  Promise.all(boxes.map( box => (
    getEventsForBox(box.id, timestamp)
      .then( events => _filterEvents(name, range, events))
      .then( events => events.map(event => _parseEvent(event, box)))
  )))
  /*getBoxes()
    .then( allBoxes => allBoxes.filter( box => boxIds.includes(box.id)))
    .then( boxes => {

    })*/
);

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
            attendees: attendees
          }
        });
    }));
  });
