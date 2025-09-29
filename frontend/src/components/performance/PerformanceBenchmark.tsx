import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { ExpandMore, Speed, Assessment } from '@mui/icons-material';
import { usePerformanceMonitor } from '../../utils/performance';

interface PerformanceBenchmarkProps {
  showDetails?: boolean;
}

export const PerformanceBenchmark: React.FC<PerformanceBenchmarkProps> = ({
  showDetails = false,
}) => {
  const { monitor, getSummary, getMetrics } = usePerformanceMonitor();
  const [summary, setSummary] = useState(getSummary());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMetrics = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setSummary(getSummary());
      setIsRefreshing(false);
    }, 100);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSummary(getSummary());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [getSummary]);

  const getPerformanceScore = (vitals: typeof summary.coreWebVitals): number => {
    let score = 100;
    
    // LCP scoring (Good: <2.5s, Needs Improvement: 2.5-4s, Poor: >4s)
    if (vitals.lcp) {
      if (vitals.lcp > 4000) score -= 30;
      else if (vitals.lcp > 2500) score -= 15;
    }

    // FCP scoring (Good: <1.8s, Needs Improvement: 1.8-3s, Poor: >3s)
    if (vitals.fcp) {
      if (vitals.fcp > 3000) score -= 25;
      else if (vitals.fcp > 1800) score -= 10;
    }

    // TTFB scoring (Good: <800ms, Needs Improvement: 800-1800ms, Poor: >1800ms)
    if (vitals.ttfb) {
      if (vitals.ttfb > 1800) score -= 20;
      else if (vitals.ttfb > 800) score -= 10;
    }

    return Math.max(0, score);
  };

  const formatTime = (ms?: number): string => {
    if (!ms) return 'N/A';
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
  };

  const getScoreColor = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const performanceScore = getPerformanceScore(summary.coreWebVitals);

  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Speed color="primary" />
            <Typography variant="h6">Performance Metrics</Typography>
            <Button
              size="small"
              onClick={refreshMetrics}
              disabled={isRefreshing}
              startIcon={<Assessment />}
            >
              Refresh
            </Button>
          </Box>

          {isRefreshing && <LinearProgress sx={{ mb: 2 }} />}

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h4" color="primary">
                    {performanceScore}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Performance Score
                  </Typography>
                  <Chip
                    label={
                      performanceScore >= 90
                        ? 'Excellent'
                        : performanceScore >= 70
                        ? 'Good'
                        : 'Needs Improvement'
                    }
                    color={getScoreColor(performanceScore)}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6">
                    {formatTime(summary.pageLoadTime)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Page Load Time
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6">
                    {formatTime(summary.coreWebVitals.fcp)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    First Contentful Paint
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6">
                    {formatTime(summary.averageResourceLoadTime)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Resource Load
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {showDetails && (
            <Box mt={3}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">Core Web Vitals</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2">
                        Largest Contentful Paint (LCP)
                      </Typography>
                      <Typography variant="h6">
                        {formatTime(summary.coreWebVitals.lcp)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Good: &lt;2.5s, Poor: &gt;4s
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2">
                        First Contentful Paint (FCP)
                      </Typography>
                      <Typography variant="h6">
                        {formatTime(summary.coreWebVitals.fcp)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Good: &lt;1.8s, Poor: &gt;3s
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2">
                        Time to First Byte (TTFB)
                      </Typography>
                      <Typography variant="h6">
                        {formatTime(summary.coreWebVitals.ttfb)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Good: &lt;800ms, Poor: &gt;1.8s
                      </Typography>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">Recent Metrics</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Duration</TableCell>
                          <TableCell align="right">Timestamp</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getMetrics()
                          .slice(-10)
                          .reverse()
                          .map((metric, index) => (
                            <TableRow key={index}>
                              <TableCell>{metric.name}</TableCell>
                              <TableCell>
                                <Chip
                                  label={metric.type}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                {formatTime(metric.duration)}
                              </TableCell>
                              <TableCell align="right">
                                {new Date(metric.timestamp).toLocaleTimeString()}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PerformanceBenchmark;