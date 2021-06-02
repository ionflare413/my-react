/** @jsxRuntime classic /
/** @jsx jsx */
// import { useRef } from 'react';
// import { Canvas, useFrame } from '@react-three/fiber';
// //import { css, jsx } from '@emotion/core';
// import { jsx, css, Global  } from '@emotion/react'
// import emotionReset from 'emotion-reset';

import { css, jsx, Global } from '@emotion/react';
import emotionReset from 'emotion-reset';
import { Work } from './work';

const globalStyles = css`
    ${emotionReset}
    *, *::after, *::before {
        box-sizing: border-box;
        -moz-osx-font-smoothing: grayscale;
        -webkit-font-smoothing: antialiased;
        font-smoothing: antialiased;
    }
`;

const App = () => (
    <div>
        <Global styles={globalStyles} />
        <Work />
    </div>
);

export default App;