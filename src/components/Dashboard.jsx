import {Link} from "react-router";

function Dashboard() {
    return (
        <div className="min-h-screen flex flex-col max-w-6xl mx-auto">
            <h1 className="mt-20 text-2xl font-bold">Dashboard</h1>
            <Link to="/tasks">Tasks</Link>
        </div>
    )
}

export default Dashboard;