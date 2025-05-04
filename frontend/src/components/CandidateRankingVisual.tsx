import React, { useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Paper,
    Button,
    useTheme,
    Tooltip,
    Chip,
    ButtonGroup
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InfoIcon from '@mui/icons-material/Info';
import { saveAs } from 'file-saver';

interface Candidate {
    applicationId: string;
    candidate: {
        id: string;
        name: string;
        email?: string;
    };
    matchScore: number;
    strengths?: string[];
    weaknesses?: string[];
    reasoning?: string;
    appliedAt: string;
    status: string;
}

interface CandidateRankingVisualProps {
    candidates: Candidate[];
    jobTitle: string;
    onSelectCandidate: (applicationId: string) => void;
}

const CandidateRankingVisual: React.FC<CandidateRankingVisualProps> = ({ 
    candidates, 
    jobTitle,
    onSelectCandidate
}) => {
    const theme = useTheme();

    useEffect(() => {
        console.log(`[CandidateRanking] Rendering visual ranking for ${candidates.length} candidates`);
        
        // Log the top candidates
        if (candidates.length > 0) {
            const topCandidates = candidates.slice(0, 3);
            console.log('[CandidateRanking] Top 3 candidates:');
            topCandidates.forEach((c, i) => {
                console.log(`[CandidateRanking] #${i+1}: ${c.candidate.name} (${c.matchScore}%)`);
            });
        }
    }, [candidates]);

    // Sort candidates by match score
    const sortedCandidates = [...candidates].sort((a, b) => b.matchScore - a.matchScore);
    
    // Only show top 10 candidates for clarity
    const topCandidates = sortedCandidates.slice(0, 10);
    
    // Calculate match score color
    const getMatchScoreColor = (score: number) => {
        if (score >= 80) return theme.palette.success.main;
        if (score >= 60) return theme.palette.primary.main;
        if (score >= 40) return theme.palette.warning.main;
        return theme.palette.error.main;
    };
    
    // Function to get label for match score
    const getMatchScoreLabel = (score: number) => {
        if (score >= 80) return 'Excellent Match';
        if (score >= 60) return 'Good Match';
        if (score >= 40) return 'Fair Match';
        return 'Poor Match';
    }
    
    // Define maximum bar width
    const maxBarWidth = 90; // percentage
    
    // Calculate ranking statistics
    const calculateStats = () => {
        if (candidates.length === 0) return null;
        
        const scores = candidates.map(c => c.matchScore);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const medianScore = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];
        const highMatchCount = scores.filter(s => s >= 70).length;
        const mediumMatchCount = scores.filter(s => s >= 50 && s < 70).length;
        const lowMatchCount = scores.filter(s => s < 50).length;
        
        console.log(`[CandidateRanking] Calculated stats - Avg: ${avgScore.toFixed(1)}%, Median: ${medianScore}%`);
        console.log(`[CandidateRanking] Matches by category - High: ${highMatchCount}, Medium: ${mediumMatchCount}, Low: ${lowMatchCount}`);
        
        return {
            avgScore,
            medianScore,
            highMatchCount,
            mediumMatchCount,
            lowMatchCount,
            totalCandidates: candidates.length
        };
    };
    
    const stats = calculateStats();
    
    // Function to export data as CSV
    const exportToCSV = () => {
        console.log(`[CandidateRanking] Exporting ${sortedCandidates.length} candidates to CSV`);
        
        // Create CSV header
        const header = ['Rank', 'Candidate Name', 'Match Score (%)', 'Match Category', 'Strengths', 'Weaknesses', 'Status', 'Applied Date'];
        
        // Create rows
        const rows = sortedCandidates.map((candidate, index) => [
            (index + 1).toString(),
            candidate.candidate.name,
            candidate.matchScore.toString(),
            getMatchScoreLabel(candidate.matchScore),
            (candidate.strengths || []).join('; '),
            (candidate.weaknesses || []).join('; '),
            candidate.status,
            new Date(candidate.appliedAt).toLocaleDateString()
        ]);
        
        // Combine header and rows
        const csvContent = [
            header.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        // Create and download the file using file-saver
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const filename = `${jobTitle.replace(/\s+/g, '_')}_candidate_rankings_${new Date().toISOString().split('T')[0]}.csv`;
        saveAs(blob, filename);
        
        console.log(`[CandidateRanking] CSV export complete: ${filename}`);
    };
    
    // Export to PDF function would go here if implemented
    
    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                    Candidate Ranking Visualization
                </Typography>
                <ButtonGroup size="small">
                    <Button 
                        startIcon={<FileDownloadIcon />}
                        onClick={exportToCSV}
                        disabled={candidates.length === 0}
                    >
                        Export CSV
                    </Button>
                </ButtonGroup>
            </Box>
            
            {stats && (
                <Box mb={4} p={2} bgcolor="background.default" borderRadius={1}>
                    <Typography variant="subtitle2" gutterBottom>Ranking Statistics</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
                        <Box sx={{ width: { xs: '50%', md: '25%' }, px: 1 }}>
                            <Box textAlign="center">
                                <Typography variant="h4" color="primary">
                                    {stats.avgScore.toFixed(1)}%
                                </Typography>
                                <Typography variant="caption">Average Match</Typography>
                            </Box>
                        </Box>
                        <Box sx={{ width: { xs: '50%', md: '25%' }, px: 1 }}>
                            <Box textAlign="center">
                                <Typography variant="h4" color="secondary">
                                    {stats.medianScore}%
                                </Typography>
                                <Typography variant="caption">Median Match</Typography>
                            </Box>
                        </Box>
                        <Box sx={{ width: { xs: '100%', md: '50%' }, px: 1, mt: { xs: 2, md: 0 } }}>
                            <Box display="flex" justifyContent="space-around">
                                <Tooltip title="Candidates with 70%+ match score">
                                    <Chip 
                                        label={`${stats.highMatchCount} High`} 
                                        size="small" 
                                        color="success"
                                    />
                                </Tooltip>
                                <Tooltip title="Candidates with 50-69% match score">
                                    <Chip 
                                        label={`${stats.mediumMatchCount} Medium`} 
                                        size="small" 
                                        color="primary"
                                    />
                                </Tooltip>
                                <Tooltip title="Candidates with <50% match score">
                                    <Chip 
                                        label={`${stats.lowMatchCount} Low`} 
                                        size="small" 
                                        color="error"
                                    />
                                </Tooltip>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            )}
            
            <Box sx={{ 
                height: topCandidates.length > 5 ? 400 : topCandidates.length * 70,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}>
                {topCandidates.map((candidate, index) => (
                    <Box 
                        key={candidate.applicationId} 
                        sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            mb: 1.5,
                            cursor: 'pointer',
                            p: 1,
                            borderRadius: 1,
                            '&:hover': {
                                bgcolor: 'action.hover',
                            }
                        }}
                        onClick={() => {
                            console.log(`[CandidateRanking] Candidate selected: ${candidate.candidate.name} (${candidate.matchScore}%)`);
                            onSelectCandidate(candidate.applicationId);
                        }}
                    >
                        <Typography 
                            variant="body1" 
                            sx={{ 
                                minWidth: 25, 
                                fontWeight: index < 3 ? 'bold' : 'normal',
                                color: index < 3 ? theme.palette.primary.main : 'inherit'
                            }}
                        >
                            {index + 1}.
                        </Typography>
                        
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                width: 150,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontWeight: index < 3 ? 'bold' : 'normal'
                            }}
                        >
                            {candidate.candidate.name}
                        </Typography>
                        
                        <Box sx={{ flex: 1, ml: 2 }}>
                            <Box 
                                sx={{ 
                                    height: 24, 
                                    width: `${(candidate.matchScore / 100) * maxBarWidth}%`,
                                    bgcolor: getMatchScoreColor(candidate.matchScore),
                                    borderRadius: 1,
                                    position: 'relative',
                                    minWidth: 30,
                                    transition: 'width 0.5s ease-in-out'
                                }}
                            >
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        position: 'absolute',
                                        right: -40,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontWeight: 'bold',
                                        color: 'text.primary'
                                    }}
                                >
                                    {candidate.matchScore}%
                                </Typography>
                            </Box>
                        </Box>
                        
                        <Tooltip 
                            title={
                                <Box>
                                    <Typography variant="caption" fontWeight="bold">Key Strengths:</Typography>
                                    <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                                        {(candidate.strengths || []).slice(0, 3).map((strength, i) => (
                                            <li key={i}><Typography variant="caption">{strength}</Typography></li>
                                        ))}
                                    </ul>
                                    {candidate.reasoning && (
                                        <>
                                            <Typography variant="caption" fontWeight="bold">Reasoning:</Typography>
                                            <Typography variant="caption" display="block">{candidate.reasoning}</Typography>
                                        </>
                                    )}
                                </Box>
                            }
                            arrow
                            placement="left"
                        >
                            <InfoIcon 
                                fontSize="small" 
                                color="action" 
                                sx={{ ml: 1, cursor: 'help' }}
                            />
                        </Tooltip>
                    </Box>
                ))}
                
                {candidates.length === 0 && (
                    <Typography variant="body2" sx={{ textAlign: 'center', py: 4 }}>
                        No candidates found
                    </Typography>
                )}
            </Box>
            
            {candidates.length > 10 && (
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 1 }}>
                    Showing top 10 of {candidates.length} candidates. Click Export for full list.
                </Typography>
            )}
        </Paper>
    );
};

export default CandidateRankingVisual; 