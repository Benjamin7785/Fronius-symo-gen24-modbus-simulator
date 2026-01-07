import React, { useState, useEffect } from 'react';
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
  FormHelperText,
  Menu,
  Tooltip
} from '@mui/material';
import { Edit, RestartAlt, Lock } from '@mui/icons-material';
import { setRegister, setRegisterOverride, clearRegisterOverride } from '../services/api';
import { onOverridesChanged } from '../services/websocket';

const RegisterTable = ({ registers, loading }) => {
  const [editDialog, setEditDialog] = useState({ open: false, register: null, forceWrite: false });
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [overriddenAddresses, setOverriddenAddresses] = useState(new Set());

  // Listen for override changes via WebSocket
  useEffect(() => {
    const unsubscribe = onOverridesChanged((addresses) => {
      setOverriddenAddresses(new Set(addresses));
    });
    
    return unsubscribe;
  }, []);

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

  const handleEdit = (register, forceWrite = false) => {
    setEditDialog({ open: true, register, forceWrite });
    setEditValue(register.value.toString());
    setError(null);
  };

  const handleClose = () => {
    setEditDialog({ open: false, register: null, forceWrite: false });
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

      if (editDialog.forceWrite) {
        // Force write (creates manual override, freezes auto-calculation)
        await setRegisterOverride(editDialog.register.address, [value]);
      } else {
        // Normal write (only works for writable registers)
        await setRegister(editDialog.register.address, value);
      }
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleContextMenu = (event, register) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      register
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleForceWrite = () => {
    if (contextMenu?.register) {
      handleEdit(contextMenu.register, true);
      handleContextMenuClose();
    }
  };

  const handleResetOverride = async (address) => {
    try {
      await clearRegisterOverride(address);
    } catch (err) {
      console.error('Failed to clear override:', err);
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
            {registers.map((register) => {
              const isOverridden = overriddenAddresses.has(register.address);
              
              return (
                <TableRow 
                  key={register.address}
                  onContextMenu={(e) => handleContextMenu(e, register)}
                  sx={{ 
                    backgroundColor: isOverridden 
                      ? '#FFF9C4' // Amber/yellow for overridden (frozen) registers
                      : register.writable ? 'action.hover' : 'inherit',
                    cursor: 'context-menu',
                    '&:hover': {
                      backgroundColor: isOverridden 
                        ? '#FFF176' 
                        : register.writable ? 'action.selected' : 'action.hover'
                    }
                  }}
                >
                  <TableCell>{register.address}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {register.name || '-'}
                      {isOverridden && (
                        <Tooltip title="Manually overridden (frozen from auto-calculation)">
                          <Lock fontSize="small" color="warning" />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
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
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {register.writable && (
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(register, false)}
                          title="Edit register"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      )}
                      {isOverridden && (
                        <IconButton
                          size="small"
                          onClick={() => handleResetOverride(register.address)}
                          title="Reset to auto-calculation"
                          color="warning"
                        >
                          <RestartAlt fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleForceWrite}>
          <Lock fontSize="small" sx={{ mr: 1 }} />
          Force Write Value... (Advanced)
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={handleClose}>
        <DialogTitle>
          {editDialog.forceWrite ? '⚠️ Force Write Register (Advanced)' : 'Edit Register'} {editDialog.register?.address}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {editDialog.forceWrite && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  ⚠️ Advanced Testing Mode
                </Typography>
                <Typography variant="body2">
                  This will FREEZE this register from auto-calculation. Use for testing device behavior with fixed values. No validation applied.
                </Typography>
              </Box>
            )}
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


