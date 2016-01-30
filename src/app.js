import { getBookings } from './lib/bookings/helpers';
import moment from 'moment'
getBookings()
  .then((bookings) => {
    bookings.forEach( (item) => {
      console.log(item.cancelBefore);
      console.log(moment.duration(100));
    });
  })
  .catch((err) => {
    console.log('err', err);
  });
