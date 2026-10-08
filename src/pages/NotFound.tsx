import { Link } from 'react-router-dom'
import { EmptyState } from '../components/Feedback'
export default function NotFound() {
  return (
    <div className="page">
      <EmptyState
        title="This one’s off the record"
        description="That page doesn’t exist. Let’s find you something to listen to."
      >
        <Link to="/" className="button primary">
          Back to Home
        </Link>
      </EmptyState>
    </div>
  )
}
