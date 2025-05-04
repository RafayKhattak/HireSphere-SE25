import React from 'react';
import { Grid } from '@mui/material';

/**
 * A wrapper component for MUI v7 Grid items that handles the breaking changes
 * between MUI v5 and v7 Grid components.
 */
interface GridItemProps {
  children: React.ReactNode;
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
  [key: string]: any; // For any other props
}

/**
 * GridItem is a compatibility component that handles the differences 
 * between MUI v5 and v7 Grid implementations
 */
const GridItem: React.FC<GridItemProps> = ({
  children,
  xs,
  sm,
  md,
  lg,
  xl,
  ...rest
}) => {
  return (
    <Grid 
      component="div" 
      sx={{ 
        gridColumn: {
          xs: xs ? `span ${xs}` : undefined,
          sm: sm ? `span ${sm}` : undefined,
          md: md ? `span ${md}` : undefined,
          lg: lg ? `span ${lg}` : undefined,
          xl: xl ? `span ${xl}` : undefined,
        }
      }}
      {...rest}
    >
      {children}
    </Grid>
  );
};

export default GridItem; 