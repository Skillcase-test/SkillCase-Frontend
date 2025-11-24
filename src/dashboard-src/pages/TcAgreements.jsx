import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  CircularProgress,
  TableSortLabel,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import api from "../../api/axios";
function TcAgreements() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState("desc"); // 'asc' or 'desc'
  const [orderBy, setOrderBy] = useState("created_at");
  useEffect(() => {
    fetchAgreements();
  }, []);
  const fetchAgreements = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/agreements");
      setAgreements(response.data.agreements);
      setError(null);
    } catch (err) {
      console.error("Error fetching agreements:", err);
      setError("Failed to load agreements. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };
  const sortedAgreements = React.useMemo(() => {
    return [...agreements].sort((a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];
      // Handle date sorting
      if (orderBy === "created_at") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      // Handle string sorting (case-insensitive)
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      if (order === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [agreements, order, orderBy]);
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Box p={3}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
      </Box>
    );
  }
  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          T&C Agreed Users
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Total agreements: {agreements.length}
        </Typography>
      </Box>
      {/* Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>
                <Typography variant="subtitle2" fontWeight="bold">
                  S.No.
                </Typography>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "name"}
                  direction={orderBy === "name" ? order : "asc"}
                  onClick={() => handleSort("name")}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    Name
                  </Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "phone_number"}
                  direction={orderBy === "phone_number" ? order : "asc"}
                  onClick={() => handleSort("phone_number")}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    Phone Number
                  </Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "email"}
                  direction={orderBy === "email" ? order : "asc"}
                  onClick={() => handleSort("email")}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    Email
                  </Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" fontWeight="bold">
                  Agreed
                </Typography>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "created_at"}
                  direction={orderBy === "created_at" ? order : "asc"}
                  onClick={() => handleSort("created_at")}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    Date Agreed
                  </Typography>
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedAgreements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" py={4}>
                    No agreements found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedAgreements.map((agreement, index) => (
                <TableRow
                  key={agreement.agreement_id}
                  hover
                  sx={{
                    "&:hover": {
                      backgroundColor: "#f9f9f9",
                    },
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {index + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {agreement.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {agreement.phone_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{agreement.email}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    {agreement.agree ? (
                      <CheckCircleIcon
                        sx={{ color: "#4caf50", fontSize: 28 }}
                      />
                    ) : (
                      <CancelIcon sx={{ color: "#f44336", fontSize: 28 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(agreement.created_at)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {/* Summary */}
      <Box
        mt={2}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <Typography variant="caption" color="text.secondary">
          Showing {sortedAgreements.length} agreement(s)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Sorted by: {orderBy === "created_at" ? "Date" : orderBy} (
          {order === "asc" ? "Ascending" : "Descending"})
        </Typography>
      </Box>
    </Box>
  );
}
export default TcAgreements;
