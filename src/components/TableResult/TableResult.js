import styles from './TableResult.module.css';
import PropTypes from 'prop-types';

function TableResult() {
    return (
        <div className={styles.displayResult} id="table">

        </div>
    );
}

// TableResult.prototype = {
//     amount: PropTypes.number.isRequired,
//     expense: PropTypes.number.isRequired,
//     price: PropTypes.number.isRequired,
//     date: PropTypes.date.isRequired,
// }

export default TableResult;