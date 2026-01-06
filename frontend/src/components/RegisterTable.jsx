import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { setRegister } from '../services/api';

const RegisterTable = ({ registers, loading }) => {
  const [editDialog, setEditDialog] = useState({ open: false, register: null });
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState(null);

  const parseRangeOptions = (range) => {
    if (!range) return null;
    
    // Parse range like "0: Disconnected\n1: Connected" or "0: OFF, 1: ON"
    const options = [];
    const lines = range.split(/[\n,]/);
    
    for (const line of lines) {
      const match = line.trim().match(/^(\d+)\s*:\s*(.+)$/);
      if (match) {
        options.push({ value: parseInt(match[1]), label: `${match[1]}: ${match[2].trim()}` });
      }
    }
    
    return options.length > 0 ? options : null;
  };

  const handleEdit = (register) => {
    setEditDialog({ open: true, register });
    setEditValue(register.value.toString());
    setError(null);
  };

  const handleClose = () => {
    setEditDialog({ open: false, register: null });
    setEditValue('');
    setError(null);
  };

  const handleSave = async () => {
    try {
      const value = parseInt(editValue);
      if (isNaN(value)) {
        setError('Invalid value');
        return;
      }

      await setRegister(editDialog.register.address, value);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const formatValue = (value, scaledValue) => {
    if (scaledValue !== undefined && scaledValue !== value) {
      return `${value} (${scaledValue})`;
    }
    return value;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!registers || registers.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 4 }}>
        No registers to display
      </Typography>
    );
  }

  return (
    <>
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell><strong>Address</strong></TableCell>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell><strong>Value</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Units</strong></TableCell>
              <TableCell><strong>R/W</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {registers.map((register) => (
              <TableRow 
                key={register.address}
                sx={{ 
                  backgroundColor: register.writable ? 'action.hover' : 'inherit'
                }}
              >
                <TableCell>{register.address}</TableCell>
                <TableCell>{register.name || '-'}</TableCell>
                <TableCell sx={{ maxWidth: 300 }}>
                  <Typography variant="body2" noWrap title={register.description}>
                    {register.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {formatValue(register.value, register.scaledValue)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={register.type} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{register.units || '-'}</TableCell>
                <TableCell>
                  <Chip 
                    label={register.writable ? 'RW' : 'R'} 
                    size="small" 
                    color={register.writable ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {register.writable && (
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(register)}
                      title="Edit register"
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={editDialog.open} onClose={handleClose}>
        <DialogTitle>Edit Register {editDialog.register?.address}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Name:</strong> {editDialog.register?.name}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Description:</strong> {editDialog.register?.description}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Type:</strong> {editDialog.register?.type}
            </Typography>
            {editDialog.register?.range && (
              <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
                <strong>Range:</strong> {editDialog.register.range}
              </Typography>
            )}
            {parseRangeOptions(editDialog.register?.range) ? (
              <FormControl fullWidth margin="normal" error={!!error}>
                <InputLabel>Value</InputLabel>
                <Select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  label="Value"
                >
                  {parseRangeOptions(editDialog.register?.range).map((option) => (
                    <MenuItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {error && <FormHelperText>{error}</FormHelperText>}
              </FormControl>
            ) : (
              <TextField
                label="Value"
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                fullWidth
                margin="normal"
                error={!!error}
                helperText={error}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RegisterTable;


