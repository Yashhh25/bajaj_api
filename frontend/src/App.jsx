import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000";

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [priorityFilter, setPriorityFilter] = useState("");
  const [breachedOnly, setBreachedOnly] = useState(false);

  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    customerEmail: "",
    priority: "medium",
  });

  const fetchTickets = async () => {
    try {
      let url = `${API}/tickets?`;

      if (priorityFilter) {
        url += `priority=${priorityFilter}&`;
      }

      if (breachedOnly) {
        url += `breached=true`;
      }

      const res = await axios.get(url);
      setTickets(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/tickets/stats`);
      setStats(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [priorityFilter, breachedOnly]);

  const createTicket = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/tickets`, formData);

      setFormData({
        subject: "",
        description: "",
        customerEmail: "",
        priority: "medium",
      });

      fetchTickets();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.message);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`${API}/tickets/${id}`, {
        status,
      });

      fetchTickets();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.message);
    }
  };

  const groupedTickets = {
    open: tickets.filter((t) => t.status === "open"),
    in_progress: tickets.filter(
      (t) => t.status === "in_progress"
    ),
    resolved: tickets.filter(
      (t) => t.status === "resolved"
    ),
    closed: tickets.filter((t) => t.status === "closed"),
  };

  const getNextStatus = (status) => {
    const order = [
      "open",
      "in_progress",
      "resolved",
      "closed",
    ];

    const index = order.indexOf(status);

    return order[index + 1];
  };

  const getPrevStatus = (status) => {
    const order = [
      "open",
      "in_progress",
      "resolved",
      "closed",
    ];

    const index = order.indexOf(status);

    return order[index - 1];
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>DeskFlow</h1>

      <div style={{ marginBottom: "20px" }}>
        <h3>Stats</h3>
        <p>Open: {stats?.status?.open || 0}</p>
        <p>In Progress: {stats?.status?.in_progress || 0}</p>
        <p>Resolved: {stats?.status?.resolved || 0}</p>
        <p>Closed: {stats?.status?.closed || 0}</p>
        <p>
          Breached Open Tickets:{" "}
          {stats?.breachedOpenTickets || 0}
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <select
          value={priorityFilter}
          onChange={(e) =>
            setPriorityFilter(e.target.value)
          }
        >
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        <label style={{ marginLeft: "20px" }}>
          <input
            type="checkbox"
            checked={breachedOnly}
            onChange={() =>
              setBreachedOnly(!breachedOnly)
            }
          />
          SLA Breached Only
        </label>
      </div>

      <form onSubmit={createTicket}>
        <input
          placeholder="Subject"
          value={formData.subject}
          onChange={(e) =>
            setFormData({
              ...formData,
              subject: e.target.value,
            })
          }
        />

        <input
          placeholder="Description"
          value={formData.description}
          onChange={(e) =>
            setFormData({
              ...formData,
              description: e.target.value,
            })
          }
        />

        <input
          placeholder="Email"
          value={formData.customerEmail}
          onChange={(e) =>
            setFormData({
              ...formData,
              customerEmail: e.target.value,
            })
          }
        />

        <select
          value={formData.priority}
          onChange={(e) =>
            setFormData({
              ...formData,
              priority: e.target.value,
            })
          }
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        <button type="submit">Create</button>
      </form>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, 1fr)",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        {Object.entries(groupedTickets).map(
          ([status, items]) => (
            <div
              key={status}
              style={{
                border: "1px solid gray",
                padding: "10px",
              }}
            >
              <h2>{status}</h2>

              {items.map((ticket) => (
                <div
                  key={ticket._id}
                  style={{
                    border: "1px solid #ddd",
                    marginBottom: "10px",
                    padding: "10px",
                  }}
                >
                  <h4>{ticket.subject}</h4>

                  <p>
                    Priority: {ticket.priority}
                  </p>

                  <p>
                    Age: {ticket.ageMinutes} mins
                  </p>

                  {ticket.slaBreached && (
                    <p>SLA Breached</p>
                  )}

                  <div>
                    {getPrevStatus(
                      ticket.status
                    ) && (
                      <button
                        onClick={() =>
                          updateStatus(
                            ticket._id,
                            getPrevStatus(
                              ticket.status
                            )
                          )
                        }
                      >
                        Prev
                      </button>
                    )}

                    {getNextStatus(
                      ticket.status
                    ) && (
                      <button
                        onClick={() =>
                          updateStatus(
                            ticket._id,
                            getNextStatus(
                              ticket.status
                            )
                          )
                        }
                      >
                        Next
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}