// A parcel only ever needs to be seen by so many serious applicants before the
// landowner has plenty of choice, capping it keeps the applicant list meaningful and
// stops a popular listing from collecting an unmanageable queue. Pre bookings for a
// future season are not counted against this cap, only active lease applications are.
const MAX_APPLICANTS = 20;

module.exports = { MAX_APPLICANTS };
