// A parcel only ever needs to be seen by so many serious applicants before the
// landowner has plenty of choice. This is the platform wide default cap, applied to
// any parcel that has not had its own maxApplicants set by an admin (see the
// maxApplicants field on the Parcel model, editable from /admin). Pre bookings for a
// future season are never counted against this cap, only active lease applications.
const MAX_APPLICANTS = 20;

module.exports = { MAX_APPLICANTS };
