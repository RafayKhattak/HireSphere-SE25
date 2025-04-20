import React from 'react';
import { 
    Box, 
    Typography, 
    Paper,
    Button,
    useTheme
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
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
    gaps?: string[];
    explanation?: string;
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
    
    // Define maximum bar width
    const maxBarWidth = 90; // percentage
    
    // Function to export data as CSV
    const exportToCSV = () => {
        // Create CSV header
        const header = ['Rank', 'Candidate Name', 'Match Score (%)', 'Status', 'Applied Date'];
        
        // Create rows
        const rows = sortedCandidates.map((candidate, index) => [
            (index + 1).toString(),
            candidate.candidate.name,
            candidate.matchScore.toString(),
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
        saveAs(blob, `${jobTitle.replace(/\s+/g, '_')}_candidate_rankings.csv`);
    };
    
    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                    Candidate Ranking Visualization
                </Typography>
                <Button 
                    size="small" 
                    startIcon={<FileDownloadIcon />}
                    onClick={exportToCSV}
                >
                    Export Rankings
                </Button>
            </Box>
            
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
                            '&:hover': {
                                opacity: 0.9
                            }
                        }}
                        onClick={() => onSelectCandidate(candidate.applicationId)}
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
                    Showing top 10 of {candidates.length} candidates
                </Typography>
            )}
        </Paper>
    );
};

export default CandidateRankingVisual; 